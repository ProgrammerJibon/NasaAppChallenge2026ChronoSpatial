"""NASA JPL Solar System Dynamics integration.

Three JPL services back the platform's moving-object science:

* **Horizons** (``https://ssd.jpl.nasa.gov/api/horizons.api``) — high precision
  observer-centred ephemerides used to predict where a known body was at the
  exact epoch of a SPHEREx exposure.
* **Small-Body Database** (``https://ssd-api.jpl.nasa.gov/sbdb.api``) — orbital
  elements, orbit-quality metrics and physical parameters for a named body.
* **Small-Body Identification** (``https://ssd-api.jpl.nasa.gov/sb_ident.api``)
  — every known minor planet or comet inside a field of view at an epoch, used
  to identify the moving objects behind detected change candidates.

None of these endpoints take an API key; ``api.nasa.gov`` credentials are not
used here and must not be forwarded to them.
"""

import hashlib
import json
import logging
import math
import os
import re
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from astropy.time import Time

from .config import output_path

logger = logging.getLogger(__name__)

HORIZONS_URL = os.getenv("JPL_HORIZONS_URL", "https://ssd.jpl.nasa.gov/api/horizons.api")
SBDB_URL = os.getenv("JPL_SBDB_URL", "https://ssd-api.jpl.nasa.gov/sbdb.api")
SB_IDENT_URL = os.getenv("JPL_SB_IDENT_URL", "https://ssd-api.jpl.nasa.gov/sb_ident.api")

ALLOWED_HOSTS = {"ssd.jpl.nasa.gov", "ssd-api.jpl.nasa.gov"}

# SPHEREx flies in a low Earth orbit, so geocentric (MPC code 500) ephemerides
# approximate the spacecraft to well under one SPHEREx pixel (6.15 arcsec) for
# main-belt and more distant bodies.
DEFAULT_OBSERVER = os.getenv("JPL_OBSERVER_CODE", "500")
DEFAULT_HORIZONS_CENTER = os.getenv("JPL_HORIZONS_CENTER", "500@399")

# sb_ident refines every first-pass hit with a numerically integrated orbit, so
# an apparent-magnitude ceiling is mandatory to keep the request bounded.
DEFAULT_VMAG_LIMIT = float(os.getenv("JPL_VMAG_LIMIT", "22"))
MAX_FIELD_HALF_WIDTH_DEG = float(os.getenv("JPL_MAX_FIELD_HALF_WIDTH_DEG", "2.5"))
DEFAULT_MATCH_TOLERANCE_ARCSEC = float(os.getenv("JPL_MATCH_TOLERANCE_ARCSEC", "60"))

CACHE_TTL = int(os.getenv("JPL_CACHE_TTL", str(7 * 86400)))
MAX_RESPONSE_BYTES = int(os.getenv("JPL_MAX_RESPONSE_BYTES", str(24 * 1024 * 1024)))

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "chrono-spatial-science-worker/1.0"})
SESSION.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=2,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )
    ),
)


class JPLError(RuntimeError):
    """Raised when a JPL service rejects a request or returns no usable data."""


def checked_url(url: str) -> str:
    """Reject anything that is not a plain HTTPS URL on a JPL SSD host."""
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in ALLOWED_HOSTS
        or parsed.username
        or parsed.port not in (None, 443)
    ):
        raise ValueError("Only HTTPS NASA JPL Solar System Dynamics URLs are allowed")
    return url


# --------------------------------------------------------------------------- #
# Coordinate formatting and parsing
# --------------------------------------------------------------------------- #

def format_ra_sexagesimal(ra_deg: float) -> str:
    """Format right ascension as the ``hh-mm-ss.ss`` string sb_ident expects."""
    if not (0 <= ra_deg < 360):
        raise ValueError("Right ascension must be within [0, 360) degrees")
    total_seconds = ra_deg / 15.0 * 3600.0
    hours, remainder = divmod(total_seconds, 3600.0)
    minutes, seconds = divmod(remainder, 60.0)
    return f"{int(hours):02d}-{int(minutes):02d}-{seconds:05.2f}"


def format_dec_sexagesimal(dec_deg: float) -> str:
    """Format declination as ``dd-mm-ss.s``; sb_ident spells minus as ``M``."""
    if not (-90 <= dec_deg <= 90):
        raise ValueError("Declination must be within [-90, 90] degrees")
    sign = "M" if dec_deg < 0 else ""
    total_seconds = abs(dec_deg) * 3600.0
    degrees, remainder = divmod(total_seconds, 3600.0)
    minutes, seconds = divmod(remainder, 60.0)
    return f"{sign}{int(degrees):02d}-{int(minutes):02d}-{seconds:04.1f}"


_SEXAGESIMAL = re.compile(r"[-+]?\d+(?:\.\d+)?")


def parse_ra_sexagesimal(value: str) -> float:
    """Parse ``'17:45:54.26'`` (hours) into degrees."""
    parts = [float(p) for p in _SEXAGESIMAL.findall(str(value))]
    if not parts:
        raise ValueError(f"Unparsable right ascension: {value!r}")
    hours = parts[0]
    minutes = parts[1] if len(parts) > 1 else 0.0
    seconds = parts[2] if len(parts) > 2 else 0.0
    return (hours + minutes / 60.0 + seconds / 3600.0) * 15.0


def parse_dec_sexagesimal(value: str) -> float:
    """Parse ``'-28 55\\'02.5\"'`` into degrees."""
    text = str(value).strip()
    parts = [float(p) for p in _SEXAGESIMAL.findall(text)]
    if not parts:
        raise ValueError(f"Unparsable declination: {value!r}")
    # sb_ident writes the sign ahead of the degrees field and may wrap the value
    # in quotes, so look for a minus anywhere before the first digit.
    first_digit = next((i for i, ch in enumerate(text) if ch.isdigit()), len(text))
    sign = -1.0 if ("-" in text[:first_digit] or text[:first_digit].upper().endswith("M")) else 1.0
    degrees = abs(parts[0])
    minutes = abs(parts[1]) if len(parts) > 1 else 0.0
    seconds = abs(parts[2]) if len(parts) > 2 else 0.0
    return sign * (degrees + minutes / 60.0 + seconds / 3600.0)


def _as_utc(moment) -> datetime:
    if isinstance(moment, datetime):
        return moment.astimezone(timezone.utc) if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
    if isinstance(moment, str):
        text = moment.strip().replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    raise TypeError(f"Unsupported epoch type: {type(moment)!r}")


def _to_float(value):
    if value is None:
        return None
    try:
        number = float(str(value).strip().rstrip("."))
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


# --------------------------------------------------------------------------- #
# Cached HTTP access
# --------------------------------------------------------------------------- #

def _fetch(url: str, params: dict, *, timeout: tuple, cache: bool = True, label: str = "jpl"):
    """GET a JPL endpoint with a bounded body and an on-disk response cache."""
    checked_url(url)
    key = hashlib.sha256(
        (url + "?" + "&".join(f"{k}={v}" for k, v in sorted(params.items()))).encode()
    ).hexdigest()
    cache_file = output_path(f"cache/{label}-{key}.json")

    if cache and cache_file.exists() and time.time() - cache_file.stat().st_mtime < CACHE_TTL:
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            logger.debug("Discarding unreadable JPL cache entry %s", cache_file)

    response = SESSION.get(url, params=params, timeout=timeout, stream=True, allow_redirects=False)
    buffer = bytearray()
    for chunk in response.iter_content(65536):
        buffer.extend(chunk)
        if len(buffer) > MAX_RESPONSE_BYTES:
            raise JPLError("JPL response exceeds the configured size limit; narrow the request")
    body = bytes(buffer).decode("utf-8", errors="replace")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise JPLError(f"JPL returned a non-JSON response ({response.status_code}): {body[:200]}")

    if response.status_code >= 400:
        message = payload.get("message") or payload.get("moreInfo") or body[:200]
        raise JPLError(f"JPL request failed ({response.status_code}): {message}")

    if cache:
        cache_file.write_text(json.dumps(payload), encoding="utf-8")
    return payload


# --------------------------------------------------------------------------- #
# Small-Body Database
# --------------------------------------------------------------------------- #

def designation_from_name(name: str) -> str:
    """Reduce an sb_ident label such as ``'69372 (1994 UA6)'`` to a lookup key."""
    text = str(name).strip()
    if not text:
        raise ValueError("Empty small-body name")
    leading = re.match(r"^(\d+)\b", text)
    if leading:
        return leading.group(1)
    parenthesised = re.search(r"\(([^)]+)\)", text)
    if parenthesised:
        return parenthesised.group(1).strip()
    return text


def small_body(designation: str, cache: bool = True) -> dict:
    """Look up orbital elements and physical parameters in the SBDB."""
    key = str(designation).strip()
    if not key:
        raise ValueError("A small-body designation is required")

    payload = _fetch(
        SBDB_URL,
        {"sstr": key, "phys-par": "1", "full-prec": "1", "discovery": "1"},
        timeout=(10, 60),
        cache=cache,
        label="sbdb",
    )

    if "object" not in payload:
        raise JPLError(f"SBDB returned no object for {key!r}: {payload.get('message', 'unknown reason')}")

    obj = payload["object"]
    orbit = payload.get("orbit") or {}
    elements = {
        element.get("name"): {
            "value": _to_float(element.get("value")),
            "sigma": _to_float(element.get("sigma")),
            "units": element.get("units"),
            "title": element.get("title"),
        }
        for element in (orbit.get("elements") or [])
        if element.get("name")
    }
    physical = {
        entry.get("name"): {
            "value": _to_float(entry.get("value")),
            "units": entry.get("units"),
            "title": entry.get("title"),
        }
        for entry in (payload.get("phys_par") or [])
        if entry.get("name")
    }

    return {
        "designation": key,
        "full_name": (obj.get("fullname") or "").strip() or key,
        "short_name": (obj.get("shortname") or "").strip() or None,
        "spk_id": obj.get("spkid"),
        "neo": bool(obj.get("neo")),
        "pha": bool(obj.get("pha")),
        "kind": obj.get("kind"),
        "orbit_class": (obj.get("orbit_class") or {}).get("name"),
        "orbit_id": orbit.get("orbit_id"),
        "epoch_jd": _to_float(orbit.get("epoch")),
        "condition_code": orbit.get("condition_code"),
        "data_arc_days": _to_float(orbit.get("data_arc")),
        "observations_used": orbit.get("n_obs_used"),
        "first_observation": orbit.get("first_obs"),
        "last_observation": orbit.get("last_obs"),
        "elements": elements,
        "physical_parameters": physical,
        "source": "NASA/JPL Small-Body Database",
    }


# --------------------------------------------------------------------------- #
# Horizons
# --------------------------------------------------------------------------- #

_HORIZONS_COLUMNS = (
    ("time_utc", lambda name: name.startswith("Date_")),
    ("ra_deg", lambda name: name.startswith("R.A.")),
    ("dec_deg", lambda name: name.startswith("DEC")),
    ("ra_rate_arcsec_per_hour", lambda name: name.startswith("dRA*cosD")),
    ("dec_rate_arcsec_per_hour", lambda name: name.startswith("d(DEC)/dt")),
    ("apparent_magnitude", lambda name: name == "APmag"),
    ("surface_brightness", lambda name: name == "S-brt"),
    ("heliocentric_distance_au", lambda name: name == "r"),
    ("heliocentric_range_rate_km_s", lambda name: name == "rdot"),
    ("observer_distance_au", lambda name: name == "delta"),
    ("observer_range_rate_km_s", lambda name: name == "deldot"),
    ("solar_elongation_deg", lambda name: name == "S-O-T"),
    ("phase_angle_deg", lambda name: name == "S-T-O"),
)

_HORIZONS_TIME_FORMATS = (
    "%Y-%b-%d %H:%M:%S.%f",
    "%Y-%b-%d %H:%M:%S",
    "%Y-%b-%d %H:%M",
    "%Y-%b-%d",
)


def _parse_horizons_time(value: str) -> datetime | None:
    text = str(value).strip().replace("*", "").strip()
    for fmt in _HORIZONS_TIME_FORMATS:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_horizons_result(result: str) -> list[dict]:
    """Turn a Horizons CSV ephemeris block into normalised row dictionaries."""
    if "$$SOE" not in result or "$$EOE" not in result:
        for marker in ("No matches found", "Multiple major-bodies match", "Cannot interpret"):
            if marker in result:
                snippet = result[result.find(marker) : result.find(marker) + 300].strip()
                raise JPLError(f"Horizons could not resolve the target: {snippet}")
        raise JPLError("Horizons returned no ephemeris block")

    head, _, tail = result.partition("$$SOE")
    body = tail.partition("$$EOE")[0]

    header_line = ""
    for line in reversed(head.splitlines()):
        stripped = line.strip()
        if stripped and not set(stripped) <= {"*"}:
            header_line = line
            break
    if not header_line:
        raise JPLError("Horizons response has no column header")

    headers = [token.strip() for token in header_line.split(",")]
    mapping: dict[int, str] = {}
    for index, name in enumerate(headers):
        if not name:
            continue
        for field, predicate in _HORIZONS_COLUMNS:
            if field in mapping.values():
                continue
            if predicate(name):
                mapping[index] = field
                break

    rows: list[dict] = []
    for line in body.splitlines():
        if not line.strip():
            continue
        cells = [cell.strip() for cell in line.split(",")]
        row: dict = {field: None for field, _ in _HORIZONS_COLUMNS}
        for index, field in mapping.items():
            if index >= len(cells):
                continue
            cell = cells[index]
            if field == "time_utc":
                moment = _parse_horizons_time(cell)
                row[field] = moment.isoformat() if moment else None
            else:
                row[field] = _to_float(cell)
        if row.get("ra_deg") is None or row.get("dec_deg") is None:
            continue
        ra_rate = row.get("ra_rate_arcsec_per_hour")
        dec_rate = row.get("dec_rate_arcsec_per_hour")
        if ra_rate is not None and dec_rate is not None:
            row["motion_arcsec_per_hour"] = math.hypot(ra_rate, dec_rate)
        else:
            row["motion_arcsec_per_hour"] = None
        rows.append(row)

    if not rows:
        raise JPLError("Horizons returned an empty ephemeris")
    return rows


def horizons_ephemeris(
    target: str,
    start: str | datetime | None = None,
    stop: str | datetime | None = None,
    step: str = "1 d",
    epochs: list | None = None,
    center: str = DEFAULT_HORIZONS_CENTER,
    small_body_target: bool = True,
    cache: bool = True,
) -> list[dict]:
    """Request an observer-centred Horizons ephemeris.

    Supply either ``start``/``stop``/``step`` for a time span, or ``epochs`` for
    an explicit list of instants (each a datetime or ISO-8601 string).
    """
    command = str(target).strip()
    if not command:
        raise ValueError("A Horizons target is required")
    # A trailing semicolon forces Horizons to search the small-body catalogue,
    # which removes the ambiguity between e.g. asteroid and planet designations.
    if small_body_target and not command.endswith(";"):
        command = command + ";"

    params = {
        "format": "json",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": f"'{center}'",
        "QUANTITIES": "'1,3,9,19,20,23,24'",
        "CSV_FORMAT": "YES",
        "ANG_FORMAT": "DEG",
        "EXTRA_PREC": "YES",
    }

    if epochs:
        julian = []
        for moment in epochs:
            utc = _as_utc(moment)
            julian.append(f"{Time(utc, scale='utc').jd:.9f}")
        if len(julian) > 50:
            raise ValueError("Horizons TLIST is limited to 50 epochs per request")
        params["TLIST"] = " ".join(julian)
    else:
        if start is None or stop is None:
            raise ValueError("Provide either an epoch list or both start and stop times")
        params["START_TIME"] = "'" + _as_utc(start).strftime("%Y-%m-%d %H:%M:%S") + "'"
        params["STOP_TIME"] = "'" + _as_utc(stop).strftime("%Y-%m-%d %H:%M:%S") + "'"
        params["STEP_SIZE"] = f"'{step}'"

    payload = _fetch(HORIZONS_URL, params, timeout=(10, 120), cache=cache, label="horizons")
    if "result" not in payload:
        raise JPLError(f"Horizons returned no result: {payload.get('error', payload)}")
    if payload.get("error"):
        raise JPLError(f"Horizons error: {payload['error']}")

    rows = _parse_horizons_result(payload["result"])
    for row in rows:
        row["target"] = str(target).strip()
        row["center"] = center
        row["source"] = "NASA/JPL Horizons"
    return rows


def predicted_position(target: str, epoch, center: str = DEFAULT_HORIZONS_CENTER, cache: bool = True) -> dict:
    """Predict a body's apparent position at a single instant."""
    rows = horizons_ephemeris(target, epochs=[epoch], center=center, cache=cache)
    return rows[0]


# --------------------------------------------------------------------------- #
# Small-Body Identification
# --------------------------------------------------------------------------- #

def identify_moving_objects(
    ra: float,
    dec: float,
    half_width_deg: float,
    epoch,
    vmag_limit: float = DEFAULT_VMAG_LIMIT,
    two_pass: bool = True,
    observer: str = DEFAULT_OBSERVER,
    cache: bool = True,
) -> list[dict]:
    """List known small bodies inside a field of view at a given instant.

    ``two_pass`` asks JPL to refine every first-pass hit with a numerically
    integrated orbit, which is what makes the returned positions trustworthy at
    the arcsecond level. ``vmag_limit`` is mandatory in practice: without it the
    refinement pass has to integrate hundreds of thousands of orbits.
    """
    if not (0 <= ra < 360 and -90 <= dec <= 90):
        raise ValueError("Invalid field centre coordinates")
    if not (0 < half_width_deg <= MAX_FIELD_HALF_WIDTH_DEG):
        raise ValueError(
            f"Field half-width must be within (0, {MAX_FIELD_HALF_WIDTH_DEG}] degrees"
        )

    when = _as_utc(epoch)
    params = {
        "mpc-code": observer,
        "obs-time": when.strftime("%Y-%m-%d_%H:%M:%S"),
        "fov-ra-center": format_ra_sexagesimal(ra),
        "fov-dec-center": format_dec_sexagesimal(dec),
        "fov-ra-hwidth": f"{half_width_deg:.4f}",
        "fov-dec-hwidth": f"{half_width_deg:.4f}",
        "mag-required": "true",
        "req-elem": "false",
        "two-pass": "true" if two_pass else "false",
        "vmag-lim": f"{float(vmag_limit):.2f}",
    }
    if two_pass:
        params["suppress-first-pass"] = "true"

    payload = _fetch(SB_IDENT_URL, params, timeout=(10, 300), cache=cache, label="sbident")

    fields = payload.get("fields_second") or payload.get("fields_first") or []
    data = payload.get("data_second_pass") or payload.get("data_first_pass") or []
    pass_used = "second" if payload.get("data_second_pass") else "first"
    if not fields:
        return []

    index = {name: position for position, name in enumerate(fields)}

    def cell(row, prefix):
        for name, position in index.items():
            if name.startswith(prefix) and position < len(row):
                return row[position]
        return None

    # The field is a box of half_width_deg per side; anything beyond its
    # circumscribed radius is a first-pass artefact rather than a real hit.
    boundary_arcsec = half_width_deg * 3600.0 * math.sqrt(2.0)

    objects: list[dict] = []
    for row in data:
        name = cell(row, "Object name")
        ra_text = cell(row, "Astrometric RA")
        dec_text = cell(row, "Astrometric Dec")
        if not name or not ra_text or not dec_text:
            continue
        try:
            object_ra = parse_ra_sexagesimal(ra_text)
            object_dec = parse_dec_sexagesimal(dec_text)
        except ValueError:
            continue

        offset = _to_float(cell(row, "Dist. from center Norm"))
        if offset is not None and offset > boundary_arcsec:
            continue

        ra_rate = _to_float(cell(row, "RA rate"))
        dec_rate = _to_float(cell(row, "Dec rate"))
        motion = math.hypot(ra_rate, dec_rate) if ra_rate is not None and dec_rate is not None else None

        objects.append({
            "name": str(name).strip(),
            "designation": designation_from_name(name),
            "ra": object_ra,
            "dec": object_dec,
            "offset_arcsec": offset,
            "apparent_magnitude": _to_float(cell(row, "Visual magnitude")),
            "ra_rate_arcsec_per_hour": ra_rate,
            "dec_rate_arcsec_per_hour": dec_rate,
            "motion_arcsec_per_hour": motion,
            "position_uncertainty_arcsec": _to_float(cell(row, "Est. error RA")),
            "epoch_utc": when.isoformat(),
            "pass": pass_used,
            "source": "NASA/JPL Small-Body Identification",
        })

    objects.sort(key=lambda item: item["offset_arcsec"] if item["offset_arcsec"] is not None else math.inf)
    return objects


# --------------------------------------------------------------------------- #
# Cross-matching
# --------------------------------------------------------------------------- #

def angular_separation_arcsec(ra_a: float, dec_a: float, ra_b: float, dec_b: float) -> float:
    """Great-circle separation in arcseconds (Vincenty, stable at small angles)."""
    phi_a, phi_b = math.radians(dec_a), math.radians(dec_b)
    delta = math.radians(ra_b - ra_a)
    numerator = math.hypot(
        math.cos(phi_b) * math.sin(delta),
        math.cos(phi_a) * math.sin(phi_b) - math.sin(phi_a) * math.cos(phi_b) * math.cos(delta),
    )
    denominator = math.sin(phi_a) * math.sin(phi_b) + math.cos(phi_a) * math.cos(phi_b) * math.cos(delta)
    return math.degrees(math.atan2(numerator, denominator)) * 3600.0


def match_moving_objects(
    candidates: list[dict],
    objects: list[dict],
    tolerance_arcsec: float = DEFAULT_MATCH_TOLERANCE_ARCSEC,
) -> list[dict]:
    """Attach the nearest known small body to each change candidate.

    Returns one entry per candidate that falls within ``tolerance_arcsec`` of a
    JPL position, carrying the separation so downstream consumers can judge the
    identification for themselves.
    """
    matches: list[dict] = []
    if not candidates or not objects:
        return matches

    for position, candidate in enumerate(candidates):
        ra = candidate.get("ra")
        dec = candidate.get("dec")
        if ra is None or dec is None:
            continue

        best = None
        best_separation = math.inf
        for obj in objects:
            separation = angular_separation_arcsec(float(ra), float(dec), obj["ra"], obj["dec"])
            if separation < best_separation:
                best, best_separation = obj, separation

        if best is None or best_separation > tolerance_arcsec:
            continue

        matches.append({
            "candidate_index": position,
            "candidate_id": candidate.get("id"),
            "candidate_ra": float(ra),
            "candidate_dec": float(dec),
            "separation_arcsec": best_separation,
            "object": best,
        })

    return matches
