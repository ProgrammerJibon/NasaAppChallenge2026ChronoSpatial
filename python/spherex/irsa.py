"""NASA/IPAC IRSA SIA2 discovery and bounded, content-addressed FITS cutout retrieval.

Primary archive integration for the Chrono & Spatial platform. Every SPHEREx
product served by the application is discovered through the IVOA Simple Image
Access v2 endpoint at https://irsa.ipac.caltech.edu/SIA and retrieved through
the IRSA Image Bounded Extraction (IBE) cutout service, so no image bytes are
ever synthesised locally.
"""

import hashlib
import io
import logging
import math
import os
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, urlencode, urlsplit, urlunsplit, parse_qsl

import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from astropy.io import fits
from astropy.io.votable import parse
from astropy.time import Time

from .config import DATA, MAX_DOWNLOAD, MAX_CACHE, MAX_PIXELS, output_path

logger = logging.getLogger(__name__)

BASE = os.getenv("IRSA_BASE_URL", "https://irsa.ipac.caltech.edu").rstrip("/")
IRSA_HOST = "irsa.ipac.caltech.edu"

# SPHEREx collections published by IRSA's SIA2 service. Verified against the
# service's own COLLECTION option list; the retired `spherex_qr2*` collections
# are intentionally absent.
COLLECTIONS = {
    "spherex_dr1",
    "spherex_dr1_cube",
    "spherex_dr1_deep",
    "spherex_qr3",
    "spherex_qr3_deep",
}
DEFAULT_COLLECTION = os.getenv("IRSA_COLLECTION", "spherex_qr3")

# SPHEREx flies six linear-variable-filter detectors (D1..D6); each SIA2 row
# reports its detector through the ObsCore energy_bandpassname field.
BAND_COUNT = 6

QUERY_CACHE_TTL = int(os.getenv("IRSA_QUERY_CACHE_TTL", "86400"))
MAX_QUERY_RESPONSE_BYTES = int(os.getenv("IRSA_MAX_QUERY_BYTES", str(32 * 1024 * 1024)))
# 0.12 degrees is about 70 SPHEREx pixels on a side at 6.15 arcsec/pixel: wide
# enough for source detection and registration, small enough to stay a few MB.
DEFAULT_CUTOUT_DEG = float(os.getenv("IRSA_CUTOUT_SIZE_DEG", "0.12"))
MAX_CUTOUT_DEG = float(os.getenv("IRSA_MAX_CUTOUT_SIZE_DEG", "0.5"))

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "chrono-spatial-science-worker/1.0"})
SESSION.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=2,
            backoff_factor=1,
            status_forcelist=[429, 502, 503, 504],
            allowed_methods=["GET"],
        )
    ),
)


def checked_url(url: str) -> str:
    """Reject anything that is not a plain HTTPS URL on the IRSA archive host."""
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != IRSA_HOST
        or parsed.username
        or parsed.port not in (None, 443)
    ):
        raise ValueError("Only HTTPS NASA/IPAC IRSA URLs are allowed")
    return url


def _clean(value):
    """Convert a VOTable cell into a plain JSON-serialisable Python value."""
    if value is None or np.ma.is_masked(value):
        return None
    if isinstance(value, bytes):
        value = value.decode(errors="replace")
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def query(
    ra: float,
    dec: float,
    radius: float,
    collection: str | None = None,
    limit: int = 150,
    calib_level: int | None = None,
) -> list[dict]:
    """Run an IRSA SIA2 positional query and return raw ObsCore rows."""
    if not (0 <= ra < 360 and -90 <= dec <= 90 and 0 < radius <= 1.0):
        raise ValueError("Invalid coordinates or query radius")

    collection = collection or DEFAULT_COLLECTION
    if collection not in COLLECTIONS:
        raise ValueError(
            "Unknown SPHEREx collection '"
            + str(collection)
            + "'. Expected one of: "
            + ", ".join(sorted(COLLECTIONS))
        )

    params = {"COLLECTION": collection, "POS": f"CIRCLE {ra} {dec} {radius}"}
    if calib_level is not None:
        params["CALIB"] = str(int(calib_level))

    url = checked_url(BASE + "/SIA")
    cache_key = hashlib.sha256((url + urlencode(sorted(params.items()))).encode()).hexdigest()
    cache = output_path(f"cache/query-{cache_key}.xml")

    if cache.exists() and time.time() - cache.stat().st_mtime < QUERY_CACHE_TTL:
        content = cache.read_bytes()
    else:
        response = SESSION.get(
            url, params=params, timeout=(10, 120), stream=True, allow_redirects=False
        )
        response.raise_for_status()
        buffer = bytearray()
        for chunk in response.iter_content(65536):
            buffer.extend(chunk)
            if len(buffer) > MAX_QUERY_RESPONSE_BYTES:
                raise ValueError("Archive query response exceeds limit; reduce radius")
        content = bytes(buffer)
        cache.write_bytes(content)

    votable = parse(io.BytesIO(content))
    for resource in votable.resources:
        for info in resource.infos:
            if info.name == "QUERY_STATUS" and info.value == "ERROR":
                raise ValueError(
                    "IRSA rejected the archive query: " + str(info.content or "unknown error")
                )

    tables = [t for t in votable.iter_tables() if t.array is not None and len(t.array) > 0]
    if not tables:
        return []

    table = tables[-1].to_table(use_names_over_ids=True)
    rows = [{name: _clean(row[name]) for name in table.colnames} for row in table]
    rows.sort(key=lambda r: r.get("t_min") or 0)

    if len(rows) > limit:
        rows = [rows[i] for i in np.linspace(0, len(rows) - 1, limit, dtype=int)]

    return [
        {
            **row,
            "archive_collection": collection,
            "query_ra": ra,
            "query_dec": dec,
            "query_radius": radius,
        }
        for row in rows
    ]


def detector_from_bandpass(bandpass: str | None) -> int:
    """Map an ObsCore bandpass name such as 'SPHEREx-D5' onto detector 1..6."""
    if isinstance(bandpass, str):
        token = bandpass.strip().upper().rsplit("-", 1)[-1]
        if token.startswith("D") and token[1:].isdigit():
            number = int(token[1:])
            if 1 <= number <= BAND_COUNT:
                return number
    return 1


def mjd_to_datetime(mjd) -> datetime | None:
    """Convert an ObsCore MJD epoch into a timezone-aware UTC datetime."""
    if mjd is None:
        return None
    try:
        value = float(mjd)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value) or value <= 0:
        return None
    return Time(value, format="mjd", scale="utc").to_datetime().replace(tzinfo=timezone.utc)


def normalize_product(row: dict) -> dict:
    """Project one SIA2 ObsCore row onto the platform's observation schema."""
    obs_id = row.get("obs_id") or row.get("obs_publisher_did") or ""
    bandpass = row.get("energy_bandpassname")
    detector = detector_from_bandpass(bandpass)
    collection = row.get("archive_collection") or row.get("obs_collection") or DEFAULT_COLLECTION

    access_url = row.get("access_url")
    if not access_url:
        raise ValueError(f"SIA2 row {obs_id!r} has no access_url")
    checked_url(access_url)

    start = mjd_to_datetime(row.get("t_min"))
    end = mjd_to_datetime(row.get("t_max"))
    if start is None:
        raise ValueError(f"SIA2 row {obs_id!r} has no usable observation epoch")

    em_min = row.get("em_min")
    em_max = row.get("em_max")
    # ObsCore spectral bounds are metres; the platform stores micrometres.
    wavelength_min = float(em_min) * 1e6 if em_min else None
    wavelength_max = float(em_max) * 1e6 if em_max else None

    if obs_id:
        archive_id = f"{obs_id}-D{detector}"
    else:
        archive_id = hashlib.sha256(access_url.encode()).hexdigest()[:32]

    estsize_kb = row.get("access_estsize")

    return {
        "archive_id": archive_id,
        "obs_id": obs_id or None,
        "collection": collection,
        "detector": detector,
        "band_number": detector,
        "bandpass": bandpass,
        "observation_date": start,
        "observation_end": end,
        "mjd_start": row.get("t_min"),
        "mjd_end": row.get("t_max"),
        "exposure_time_s": row.get("t_exptime"),
        "ra": float(row["s_ra"]) if row.get("s_ra") is not None else None,
        "dec": float(row["s_dec"]) if row.get("s_dec") is not None else None,
        "wavelength_min_um": wavelength_min,
        "wavelength_max_um": wavelength_max,
        "spectral_resolving_power": row.get("em_res_power"),
        "access_url": access_url,
        "access_format": row.get("access_format"),
        "access_estsize_kb": int(estsize_kb) if estsize_kb else None,
        "calib_level": row.get("calib_level"),
        "dataproduct_type": row.get("dataproduct_type"),
        "dataproduct_subtype": row.get("dataproduct_subtype"),
        "instrument": row.get("instrument_name"),
        "facility": row.get("facility_name"),
        "target_name": row.get("target_name"),
        "proposal_id": row.get("proposal_id"),
        "publisher_did": row.get("obs_publisher_did"),
        "s_region": row.get("s_region"),
        "pixel_scale_arcsec": row.get("s_pixel_scale"),
        "spatial_resolution_arcsec": row.get("s_resolution"),
        "fov_deg": row.get("s_fov"),
        "width": int(row["s_xel1"]) if row.get("s_xel1") else 0,
        "height": int(row["s_xel2"]) if row.get("s_xel2") else 0,
        "release_date": row.get("obs_release_date"),
        "query_ra": row.get("query_ra"),
        "query_dec": row.get("query_dec"),
        "query_radius": row.get("query_radius"),
    }


def search_products(
    ra: float,
    dec: float,
    radius: float,
    collection: str | None = None,
    limit: int = 150,
    band: int | None = None,
) -> list[dict]:
    """Discover SPHEREx products and return them in the platform's schema."""
    products: list[dict] = []
    seen: set[str] = set()
    for row in query(ra, dec, radius, collection=collection, limit=limit):
        try:
            product = normalize_product(row)
        except ValueError as err:
            logger.debug("Skipping unusable SIA2 row: %s", err)
            continue
        if band is not None and product["band_number"] != band:
            continue
        if product["archive_id"] in seen:
            continue
        seen.add(product["archive_id"])
        products.append(product)
    products.sort(key=lambda p: p["observation_date"])
    return products


def cutout_url(access_url: str, ra: float, dec: float, size_deg: float = DEFAULT_CUTOUT_DEG) -> str:
    """Build an IRSA IBE cutout URL for a bounded region of an archive product."""
    checked_url(access_url)
    if not (0 <= ra < 360 and -90 <= dec <= 90):
        raise ValueError("Invalid cutout centre coordinates")
    if not (0 < size_deg <= MAX_CUTOUT_DEG):
        raise ValueError(f"Cutout size must be within (0, {MAX_CUTOUT_DEG}] degrees")

    parts = urlsplit(access_url)
    params = dict(parse_qsl(parts.query))
    params["center"] = f"{ra:.6f},{dec:.6f}"
    params["size"] = f"{size_deg:.6f}"
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(params), ""))


# A download that dies mid-write (a killed worker, a dropped connection) leaves
# its .part file behind; anything older than this is certainly abandoned.
PARTIAL_DOWNLOAD_TTL = int(os.getenv("IRSA_PARTIAL_TTL", "3600"))


def prune_cache(directory: str = "fits", budget: int = MAX_CACHE) -> int:
    """Evict least-recently-used cached files until the directory fits its budget.

    Abandoned partial downloads are removed first, whatever the budget.
    """
    target = DATA / directory
    if not target.exists():
        return 0

    now = time.time()
    for partial in target.glob("*.part"):
        try:
            if now - partial.stat().st_mtime > PARTIAL_DOWNLOAD_TTL:
                partial.unlink()
                logger.info("Removed abandoned partial download %s", partial.name)
        except OSError:
            continue

    files = [p for p in target.iterdir() if p.is_file() and p.suffix != ".part"]
    total = sum(p.stat().st_size for p in files)
    removed = 0
    if total <= budget:
        return 0
    for path in sorted(files, key=lambda p: p.stat().st_mtime):
        if total <= budget:
            break
        size = path.stat().st_size
        try:
            path.unlink()
        except OSError:
            continue
        total -= size
        removed += 1
    if removed:
        logger.info("Evicted %d cached archive file(s) to stay within the cache budget.", removed)
    return removed


def download_cutout(
    access_url: str,
    ra: float,
    dec: float,
    size_deg: float = DEFAULT_CUTOUT_DEG,
    refresh: bool = False,
):
    """Fetch a bounded FITS cutout from IRSA into the content-addressed store.

    Returns the local :class:`~pathlib.Path`. Repeat calls for the same cutout
    reuse the cached file, so the archive is queried once per distinct region.
    """
    url = cutout_url(access_url, ra, dec, size_deg)
    digest = hashlib.sha256(url.encode()).hexdigest()
    destination = output_path(f"fits/{digest}.fits")

    if destination.exists() and destination.stat().st_size > 0 and not refresh:
        os.utime(destination, None)
        return destination

    response = SESSION.get(url, timeout=(10, 180), stream=True, allow_redirects=False)
    if response.status_code >= 400:
        detail = (response.text or "")[:200].strip() or response.reason
        raise ValueError(f"IRSA cutout request failed ({response.status_code}): {detail}")
    response.raise_for_status()

    declared = response.headers.get("Content-Length")
    if declared and int(declared) > MAX_DOWNLOAD:
        raise ValueError(
            f"Archive product is {int(declared)} bytes, above the {MAX_DOWNLOAD} byte limit"
        )

    temporary = destination.with_suffix(".part")
    written = 0
    try:
        with temporary.open("wb") as handle:
            for chunk in response.iter_content(65536):
                if not chunk:
                    continue
                written += len(chunk)
                if written > MAX_DOWNLOAD:
                    raise ValueError(
                        f"Archive download exceeded the {MAX_DOWNLOAD} byte limit; reduce the cutout size"
                    )
                handle.write(chunk)

        if written == 0:
            raise ValueError("IRSA returned an empty cutout")

        with temporary.open("rb") as handle:
            if handle.read(6) != b"SIMPLE":
                raise ValueError("IRSA cutout response is not a FITS file")

        with fits.open(temporary, memmap=False) as hdus:
            hdus.verify("exception")
            sizes = [
                h.data.size
                for h in hdus
                if getattr(h, "data", None) is not None and h.data.ndim == 2
            ]
            if not sizes:
                raise ValueError("IRSA cutout contains no two-dimensional image plane")
            if max(sizes) > MAX_PIXELS:
                raise ValueError("IRSA cutout exceeds the configured pixel budget")

        temporary.replace(destination)
    finally:
        if temporary.exists():
            temporary.unlink(missing_ok=True)

    prune_cache()
    return destination
