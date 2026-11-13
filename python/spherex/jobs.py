"""Job handlers for the SPHEREx science worker.

Every observation the platform serves is discovered through NASA/IPAC IRSA and
every moving-object identification comes from NASA JPL; nothing here fabricates
imagery or ephemerides.
"""

import hashlib
import logging
import math
import os
from datetime import datetime, timezone

import numpy as np

from . import config
from .database import execute, query_one, query_all, encode_json, decode_json
from .fits import read_fits, get_plane_metadata
from .previews import generate_preview
from .comparison import compute_difference
from .detection import detect_sources, extract_candidates
from .storage import resolve_file
from . import irsa
from . import jpl

logger = logging.getLogger(__name__)

# How many archive products one FETCH_OBSERVATIONS job will materialise. Each
# one is a bounded IRSA cutout download plus a FITS read and preview render.
MAX_PRODUCTS_PER_FETCH = int(os.getenv("FETCH_MAX_PRODUCTS", "8"))
DEFAULT_CUTOUT_DEG = irsa.DEFAULT_CUTOUT_DEG


def _observation_id(archive_id: str) -> str:
    """Deterministic primary key so repeated fetches update rather than duplicate."""
    return "obs-" + hashlib.sha256(archive_id.encode()).hexdigest()[:24]


def _naive_utc(moment: datetime | None) -> datetime | None:
    """MySQL DATETIME columns hold naive UTC."""
    if moment is None:
        return None
    if moment.tzinfo is None:
        return moment
    return moment.astimezone(timezone.utc).replace(tzinfo=None)


def _nearest_region(db_conn, ra: float, dec: float) -> str | None:
    """Associate a product with a configured sky region when one is close enough."""
    regions = query_all(db_conn, "SELECT id, ra, `dec`, radius_deg FROM sky_regions")
    best_id, best_separation = None, math.inf
    for region in regions or []:
        separation = (
            jpl.angular_separation_arcsec(ra, dec, float(region["ra"]), float(region["dec"])) / 3600.0
        )
        tolerance = max(float(region.get("radius_deg") or 0.25), 0.25) + 1.75
        if separation <= tolerance and separation < best_separation:
            best_id, best_separation = region["id"], separation
    return best_id


# --------------------------------------------------------------------------- #
# FETCH_OBSERVATIONS
# --------------------------------------------------------------------------- #

def handle_fetch_observations(payload: dict, update_progress, db_conn) -> dict:
    """Discover SPHEREx products at a sky position and ingest them locally.

    Discovery goes through the IRSA SIA2 service; pixels come from the IRSA IBE
    cutout service. Each product becomes one row in ``observations`` with a
    locally cached FITS cutout and a rendered preview.
    """
    ra = float(payload["ra"])
    dec = float(payload["dec"])
    radius = float(payload.get("radiusDeg", 0.25))
    band = payload.get("band")
    band = int(band) if band not in (None, "") else None
    collection = payload.get("collection") or irsa.DEFAULT_COLLECTION
    cutout_deg = float(payload.get("cutoutDeg", DEFAULT_CUTOUT_DEG))
    max_products = int(payload.get("maxProducts", MAX_PRODUCTS_PER_FETCH))
    query_hash = payload.get("queryHash") or hashlib.sha256(
        f"{ra}:{dec}:{radius}:{band if band is not None else 'all'}".encode()
    ).hexdigest()

    update_progress(5)
    logger.info(
        "FETCH_OBSERVATIONS: IRSA SIA2 discovery at RA=%.5f Dec=%.5f radius=%.3f deg (%s)",
        ra, dec, radius, collection,
    )

    products = irsa.search_products(
        ra, dec, radius, collection=collection, limit=max(max_products * 6, 60), band=band
    )
    logger.info("IRSA SIA2 returned %d usable SPHEREx products", len(products))

    update_progress(20)

    # Spread the selection across the observed time span so the ingested set is
    # useful for multi-epoch comparison rather than clustered in one visit.
    selected = products
    if len(products) > max_products:
        indices = np.linspace(0, len(products) - 1, max_products, dtype=int)
        selected = [products[int(i)] for i in sorted(set(indices.tolist()))]

    region_id = _nearest_region(db_conn, ra, dec)

    ingested: list[dict] = []
    failures: list[dict] = []

    for position, product in enumerate(selected):
        progress = 20.0 + 70.0 * (position / max(len(selected), 1))
        update_progress(round(progress, 1))
        try:
            record = _ingest_product(db_conn, product, ra, dec, cutout_deg, region_id)
            ingested.append(record)
        except Exception as error:  # one bad product must not fail the whole job
            logger.warning("Skipping product %s: %s", product.get("archive_id"), error)
            failures.append({"archive_id": product.get("archive_id"), "reason": str(error)})

    update_progress(95)

    execute(
        db_conn,
        """INSERT INTO archive_queries (
               id, query_hash, ra, `dec`, radius_deg, status, result_count, created_at, expires_at
           ) VALUES (%s, %s, %s, %s, %s, %s, %s, UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 1 DAY))
           ON DUPLICATE KEY UPDATE
               status = VALUES(status),
               result_count = VALUES(result_count),
               created_at = VALUES(created_at),
               expires_at = VALUES(expires_at)""",
        (
            "aq-" + query_hash[:24],
            query_hash,
            ra,
            dec,
            radius,
            "completed" if ingested else "empty",
            len(ingested),
        ),
    )

    update_progress(100)
    return {
        "status": "completed",
        "ra": ra,
        "dec": dec,
        "radius": radius,
        "collection": collection,
        "band": band,
        "products_discovered": len(products),
        "observations_ingested": len(ingested),
        "observation_ids": [item["id"] for item in ingested],
        "failures": failures,
        "source": "NASA/IPAC IRSA SIA2 + IBE cutout service",
    }


def _ingest_product(db_conn, product: dict, ra: float, dec: float, cutout_deg: float, region_id):
    """Download, validate and persist a single IRSA SPHEREx product."""
    observation_id = _observation_id(product["archive_id"])

    fits_path = irsa.download_cutout(product["access_url"], ra, dec, cutout_deg)
    plane = read_fits(fits_path)
    metadata = get_plane_metadata(plane)

    relative_fits = fits_path.relative_to(config.STORAGE_PATH).as_posix()
    relative_preview = f"previews/{observation_id}.webp"
    generate_preview(plane.image, config.output_path(relative_preview), mask=plane.mask)

    # SIA2 carries the authoritative spectral bounds; the FITS header carries the
    # wavelength actually sampled at the cutout centre on the LVF.
    wavelength_min = product.get("wavelength_min_um")
    wavelength_max = product.get("wavelength_max_um")
    centre_wavelength = metadata.get("wavelength_um")

    metadata_json = {
        "archive": "NASA/IPAC IRSA",
        "service": "SIA2",
        "collection": product.get("collection"),
        "obs_id": product.get("obs_id"),
        "publisher_did": product.get("publisher_did"),
        "detector": product.get("detector"),
        "bandpass": product.get("bandpass"),
        "instrument": product.get("instrument"),
        "facility": product.get("facility"),
        "calib_level": product.get("calib_level"),
        "dataproduct_type": product.get("dataproduct_type"),
        "dataproduct_subtype": product.get("dataproduct_subtype"),
        "proposal_id": product.get("proposal_id"),
        "target_name": product.get("target_name"),
        "exposure_time_s": product.get("exposure_time_s"),
        "mjd_start": product.get("mjd_start"),
        "mjd_end": product.get("mjd_end"),
        "spectral_resolving_power": product.get("spectral_resolving_power"),
        "pixel_scale_arcsec": product.get("pixel_scale_arcsec"),
        "spatial_resolution_arcsec": product.get("spatial_resolution_arcsec"),
        "s_region": product.get("s_region"),
        "full_frame_width": product.get("width"),
        "full_frame_height": product.get("height"),
        "cutout": {
            "center_ra": ra,
            "center_dec": dec,
            "size_deg": cutout_deg,
            "url": irsa.cutout_url(product["access_url"], ra, dec, cutout_deg),
            "service": "IRSA IBE",
        },
        "image": {
            "unit": metadata.get("unit"),
            "valid_fraction": metadata.get("valid_fraction"),
            "has_variance": metadata.get("has_variance"),
            "center_wavelength_um": centre_wavelength,
        },
    }

    execute(
        db_conn,
        """INSERT INTO observations (
               id, archive_id, region_id, observation_date, ra, `dec`,
               band_number, wavelength_min_um, wavelength_max_um, archive_url,
               fits_path, preview_path, width, height, status, metadata_json,
               created_at, updated_at
           ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                     UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
           ON DUPLICATE KEY UPDATE
               region_id = VALUES(region_id),
               observation_date = VALUES(observation_date),
               ra = VALUES(ra),
               `dec` = VALUES(`dec`),
               band_number = VALUES(band_number),
               wavelength_min_um = VALUES(wavelength_min_um),
               wavelength_max_um = VALUES(wavelength_max_um),
               archive_url = VALUES(archive_url),
               fits_path = VALUES(fits_path),
               preview_path = VALUES(preview_path),
               width = VALUES(width),
               height = VALUES(height),
               status = VALUES(status),
               metadata_json = VALUES(metadata_json),
               updated_at = UTC_TIMESTAMP(3)""",
        (
            observation_id,
            product["archive_id"],
            region_id,
            _naive_utc(product["observation_date"]),
            float(metadata["ra"]),
            float(metadata["dec"]),
            int(product["band_number"]),
            float(wavelength_min) if wavelength_min is not None else 0.0,
            float(wavelength_max) if wavelength_max is not None else 0.0,
            product["access_url"],
            relative_fits,
            relative_preview,
            int(metadata["width"]),
            int(metadata["height"]),
            "available",
            encode_json(metadata_json),
        ),
    )

    return {
        "id": observation_id,
        "archive_id": product["archive_id"],
        "observation_date": product["observation_date"].isoformat(),
        "band_number": product["band_number"],
        "fits_path": relative_fits,
        "preview_path": relative_preview,
        "width": metadata["width"],
        "height": metadata["height"],
    }


# --------------------------------------------------------------------------- #
# COMPARE_EPOCHS
# --------------------------------------------------------------------------- #

def handle_compare_epochs(payload: dict, update_progress, db_conn) -> dict:
    comp_id = payload["comparisonId"]
    obs_a_id = payload["observationAId"]
    obs_b_id = payload["observationBId"]

    update_progress(10)
    logger.info("COMPARE_EPOCHS: %s vs %s (comparison %s)", obs_a_id, obs_b_id, comp_id)

    obs_a = query_one(db_conn, "SELECT * FROM observations WHERE id = %s", (obs_a_id,))
    obs_b = query_one(db_conn, "SELECT * FROM observations WHERE id = %s", (obs_b_id,))

    if not obs_a or not obs_b:
        raise ValueError("One or both observation records not found in database")

    file_a = resolve_file(obs_a.get("fits_path", ""))
    file_b = resolve_file(obs_b.get("fits_path", ""))

    if not file_a or not file_a.exists():
        raise ValueError(f"FITS file for observation A not found: {obs_a.get('fits_path')}")
    if not file_b or not file_b.exists():
        raise ValueError(f"FITS file for observation B not found: {obs_b.get('fits_path')}")

    update_progress(25)
    plane_a = read_fits(file_a)
    plane_b = read_fits(file_b)

    update_progress(50)
    diff_result = compute_difference(plane_a, plane_b)

    diff_dir = config.STORAGE_PATH / "differences"
    diff_dir.mkdir(parents=True, exist_ok=True)

    rel_aligned_a = f"differences/{comp_id}-aligned-a.webp"
    rel_aligned_b = f"differences/{comp_id}-aligned-b.webp"
    rel_difference = f"differences/{comp_id}.webp"
    rel_significance = f"differences/{comp_id}-significance.webp"

    generate_preview(plane_a.image, config.STORAGE_PATH / rel_aligned_a, mask=diff_result["mask"])
    generate_preview(diff_result["aligned_b"], config.STORAGE_PATH / rel_aligned_b, mask=diff_result["mask"])
    generate_preview(diff_result["difference"], config.STORAGE_PATH / rel_difference, mask=diff_result["mask"], signed=True)
    generate_preview(diff_result["significance"], config.STORAGE_PATH / rel_significance, mask=diff_result["mask"], signed=True)

    update_progress(75)

    sources_a = detect_sources(plane_a.image, plane_a.wcs, plane_a.variance, plane_a.mask)
    sources_b = detect_sources(
        diff_result["aligned_b"], plane_a.wcs, diff_result["variance_b"], diff_result["mask"]
    )

    date_a = obs_a.get("observation_date")
    date_b = obs_b.get("observation_date")
    interval_days = 180.0
    if isinstance(date_a, datetime) and isinstance(date_b, datetime):
        interval_days = max(1.0, abs((date_b - date_a).total_seconds() / 86400.0))

    candidates = extract_candidates(sources_a, sources_b, interval_days)

    candidate_ids: list[str] = []
    for idx, candidate in enumerate(candidates):
        cand_id = f"cand-{comp_id[:8]}-{idx + 1:02d}"
        candidate_ids.append(cand_id)
        candidate["id"] = cand_id
        execute(
            db_conn,
            """INSERT INTO change_candidates (
                id, comparison_id, x, y, ra, `dec`,
                change_type, motion_arcsec, brightness_change, score,
                metadata_json, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, UTC_TIMESTAMP(3))
            ON DUPLICATE KEY UPDATE
                x = VALUES(x), y = VALUES(y), ra = VALUES(ra), `dec` = VALUES(`dec`),
                change_type = VALUES(change_type), motion_arcsec = VALUES(motion_arcsec),
                brightness_change = VALUES(brightness_change), score = VALUES(score),
                metadata_json = VALUES(metadata_json)""",
            (
                cand_id,
                comp_id,
                candidate["x"],
                candidate["y"],
                candidate["ra"],
                candidate["dec"],
                candidate["change_type"],
                candidate["motion_arcsec"],
                candidate["brightness_change"],
                candidate["score"],
                encode_json(candidate["metadata_json"]),
            ),
        )

    summary = {
        "time_interval_days": round(interval_days, 1),
        "rms_difference": round(float(np.nanstd(diff_result["difference"])), 4),
        "candidates_count": len(candidates),
        "sources_a_count": len(sources_a),
        "sources_b_count": len(sources_b),
        "metadata": diff_result["metadata"],
    }

    execute(
        db_conn,
        """UPDATE comparisons SET
            status = 'completed',
            aligned_a_path = %s,
            aligned_b_path = %s,
            difference_path = %s,
            significance_path = %s,
            summary_json = %s,
            completed_at = UTC_TIMESTAMP(3)
        WHERE id = %s""",
        (
            rel_aligned_a,
            rel_aligned_b,
            rel_difference,
            rel_significance,
            encode_json(summary),
            comp_id,
        ),
    )

    # Hand the moving-object question to JPL in its own job so a slow
    # ephemeris refinement never delays the imagery the user is waiting for.
    if candidates and payload.get("identifyMovingObjects", True):
        queue_identify_objects(db_conn, comp_id)

    update_progress(100)
    return {
        "status": "completed",
        "comparisonId": comp_id,
        "candidatesDetected": len(candidates),
        "candidateIds": candidate_ids,
        "summary": summary,
    }


# --------------------------------------------------------------------------- #
# IDENTIFY_OBJECTS
# --------------------------------------------------------------------------- #

def queue_identify_objects(db_conn, comparison_id: str, priority: int = 1) -> str | None:
    """Queue a JPL identification pass for a completed comparison."""
    existing = query_one(
        db_conn,
        """SELECT id FROM processing_jobs
           WHERE type = 'IDENTIFY_OBJECTS'
             AND status IN ('queued', 'processing')
             AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.comparisonId')) = %s""",
        (comparison_id,),
    )
    if existing:
        return existing["id"]

    job_id = "job-identify-" + hashlib.sha256(
        f"{comparison_id}:{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()[:24]
    execute(
        db_conn,
        """INSERT INTO processing_jobs (
               id, type, status, priority, payload_json, progress, attempts, created_at
           ) VALUES (%s, 'IDENTIFY_OBJECTS', 'queued', %s, %s, 0.0, 0, UTC_TIMESTAMP(3))""",
        (job_id, priority, encode_json({"comparisonId": comparison_id})),
    )
    logger.info("Queued IDENTIFY_OBJECTS job %s for comparison %s", job_id, comparison_id)
    return job_id


def handle_identify_objects(payload: dict, update_progress, db_conn) -> dict:
    """Identify the known solar-system bodies behind a comparison's candidates.

    Asks JPL's Small-Body Identification service which minor planets and comets
    were inside the field at the epoch of the later observation, cross-matches
    them against the detected change candidates, and records the orbit of each
    match from the Small-Body Database.
    """
    comp_id = payload["comparisonId"]
    tolerance = float(payload.get("toleranceArcsec", jpl.DEFAULT_MATCH_TOLERANCE_ARCSEC))
    vmag_limit = float(payload.get("vmagLimit", jpl.DEFAULT_VMAG_LIMIT))

    update_progress(5)

    comparison = query_one(db_conn, "SELECT * FROM comparisons WHERE id = %s", (comp_id,))
    if not comparison:
        raise ValueError(f"Comparison not found: {comp_id}")

    obs_b = query_one(
        db_conn, "SELECT * FROM observations WHERE id = %s", (comparison["observation_b_id"],)
    )
    if not obs_b:
        raise ValueError("Later observation for this comparison is missing")

    epoch = obs_b.get("observation_date")
    if not isinstance(epoch, datetime):
        raise ValueError("Later observation has no usable observation date")
    if epoch.tzinfo is None:
        epoch = epoch.replace(tzinfo=timezone.utc)

    candidates = query_all(
        db_conn,
        "SELECT id, x, y, ra, `dec`, change_type, score, metadata_json FROM change_candidates WHERE comparison_id = %s",
        (comp_id,),
    ) or []

    centre_ra = float(obs_b["ra"])
    centre_dec = float(obs_b["dec"])

    # Cover the cutout plus a margin for ephemeris uncertainty.
    width = int(obs_b.get("width") or 0)
    height = int(obs_b.get("height") or 0)
    pixel_scale = 6.15
    # PyMySQL returns JSON columns as strings, so decode before reading them.
    metadata = decode_json(obs_b.get("metadata_json"), {}) or {}
    if isinstance(metadata, dict):
        pixel_scale = float(metadata.get("pixel_scale_arcsec") or pixel_scale)
    extent_deg = max(width, height, 32) * pixel_scale / 3600.0
    half_width = min(
        max(extent_deg / 2.0 + 0.02, 0.05), jpl.MAX_FIELD_HALF_WIDTH_DEG
    )

    update_progress(20)
    logger.info(
        "IDENTIFY_OBJECTS: JPL sb_ident at RA=%.5f Dec=%.5f half-width=%.4f deg, epoch %s",
        centre_ra, centre_dec, half_width, epoch.isoformat(),
    )

    objects = jpl.identify_moving_objects(
        centre_ra, centre_dec, half_width, epoch, vmag_limit=vmag_limit, two_pass=True
    )
    update_progress(60)

    matches = jpl.match_moving_objects(candidates, objects, tolerance_arcsec=tolerance)

    execute(db_conn, "DELETE FROM moving_object_matches WHERE comparison_id = %s", (comp_id,))

    # Drop identifications from a previous pass so a candidate never keeps a
    # match that this run no longer supports.
    matched_ids = {match["candidate_id"] for match in matches if match["candidate_id"]}
    for candidate in candidates:
        if candidate["id"] in matched_ids:
            continue
        _clear_candidate_identification(db_conn, candidate)

    recorded = []
    for position, match in enumerate(matches):
        update_progress(60 + round(30.0 * (position / max(len(matches), 1)), 1))
        obj = match["object"]

        orbit = None
        try:
            orbit = jpl.small_body(obj["designation"])
        except Exception as error:
            logger.warning("SBDB lookup failed for %s: %s", obj["designation"], error)

        match_id = "mom-" + hashlib.sha256(
            f"{comp_id}:{match['candidate_id']}:{obj['name']}".encode()
        ).hexdigest()[:24]

        execute(
            db_conn,
            """INSERT INTO moving_object_matches (
                   id, comparison_id, candidate_id, object_name, object_designation,
                   ra, `dec`, separation_arcsec, offset_arcsec, apparent_magnitude,
                   ra_rate_arcsec_per_hour, dec_rate_arcsec_per_hour, motion_arcsec_per_hour,
                   epoch_utc, source, orbit_json, created_at
               ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, UTC_TIMESTAMP(3))
               ON DUPLICATE KEY UPDATE
                   ra = VALUES(ra), `dec` = VALUES(`dec`),
                   separation_arcsec = VALUES(separation_arcsec),
                   offset_arcsec = VALUES(offset_arcsec),
                   apparent_magnitude = VALUES(apparent_magnitude),
                   ra_rate_arcsec_per_hour = VALUES(ra_rate_arcsec_per_hour),
                   dec_rate_arcsec_per_hour = VALUES(dec_rate_arcsec_per_hour),
                   motion_arcsec_per_hour = VALUES(motion_arcsec_per_hour),
                   epoch_utc = VALUES(epoch_utc),
                   orbit_json = VALUES(orbit_json)""",
            (
                match_id,
                comp_id,
                match["candidate_id"],
                obj["name"],
                obj["designation"],
                obj["ra"],
                obj["dec"],
                match["separation_arcsec"],
                obj.get("offset_arcsec"),
                obj.get("apparent_magnitude"),
                obj.get("ra_rate_arcsec_per_hour"),
                obj.get("dec_rate_arcsec_per_hour"),
                obj.get("motion_arcsec_per_hour"),
                _naive_utc(epoch),
                "NASA/JPL Small-Body Identification",
                encode_json(orbit) if orbit else None,
            ),
        )

        if match["candidate_id"]:
            _annotate_candidate(db_conn, match["candidate_id"], obj, match["separation_arcsec"], orbit)

        recorded.append({
            "candidateId": match["candidate_id"],
            "objectName": obj["name"],
            "designation": obj["designation"],
            "separationArcsec": round(match["separation_arcsec"], 3),
            "apparentMagnitude": obj.get("apparent_magnitude"),
            "motionArcsecPerHour": obj.get("motion_arcsec_per_hour"),
            "orbitClass": (orbit or {}).get("orbit_class"),
        })

    update_progress(100)
    return {
        "status": "completed",
        "comparisonId": comp_id,
        "epochUtc": epoch.isoformat(),
        "fieldHalfWidthDeg": round(half_width, 4),
        "vmagLimit": vmag_limit,
        "objectsInField": len(objects),
        "candidatesExamined": len(candidates),
        "identifications": recorded,
        "source": "NASA/JPL Small-Body Identification + Small-Body Database",
    }


def _annotate_candidate(db_conn, candidate_id: str, obj: dict, separation: float, orbit: dict | None) -> None:
    """Record the identification inside the candidate's own metadata."""
    row = query_one(
        db_conn, "SELECT metadata_json FROM change_candidates WHERE id = %s", (candidate_id,)
    )
    metadata = decode_json(row.get("metadata_json"), {}) if row else {}
    if not isinstance(metadata, dict):
        metadata = {}

    # The detector's own classification stays untouched: the JPL result is an
    # additional, separately sourced opinion, not a replacement for it.
    metadata["solar_system_identification"] = {
        "object_name": obj["name"],
        "designation": obj["designation"],
        "separation_arcsec": round(separation, 3),
        "apparent_magnitude": obj.get("apparent_magnitude"),
        "motion_arcsec_per_hour": obj.get("motion_arcsec_per_hour"),
        "orbit_class": (orbit or {}).get("orbit_class"),
        "neo": (orbit or {}).get("neo"),
        "source": "NASA/JPL",
    }

    execute(
        db_conn,
        "UPDATE change_candidates SET metadata_json = %s WHERE id = %s",
        (encode_json(metadata), candidate_id),
    )


def _clear_candidate_identification(db_conn, candidate: dict) -> None:
    """Remove a stale JPL identification from a candidate that no longer matches."""
    metadata = decode_json(candidate.get("metadata_json"), {})
    if not isinstance(metadata, dict) or "solar_system_identification" not in metadata:
        return
    metadata.pop("solar_system_identification", None)
    # Older runs also rewrote possible_class; undo that so the detector's own
    # classification is what remains.
    if isinstance(metadata.get("possible_class"), str) and metadata["possible_class"].startswith(
        "Known solar-system body:"
    ):
        metadata.pop("possible_class", None)
    execute(
        db_conn,
        "UPDATE change_candidates SET metadata_json = %s WHERE id = %s",
        (encode_json(metadata), candidate["id"]),
    )
