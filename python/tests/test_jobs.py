"""Tests for the worker job handlers that drive the NASA integrations.

These exercise the real ingestion and identification logic end to end against a
recording database stub and a synthetic SPHEREx-shaped FITS file, so the SQL
each job issues and the values it writes are checked without needing MySQL.
"""

import json
from datetime import datetime, timezone

import numpy as np
import pytest
from astropy.io import fits
from astropy.wcs import WCS

from spherex import config, jobs
from spherex.database import decode_json, encode_json


class FakeConnection:
    """Records every statement a job issues and replays canned SELECT results."""

    def __init__(self, responses=None):
        self.statements = []
        self.responses = responses or {}

    def record(self, sql, params):
        self.statements.append((" ".join(sql.split()), params))

    def find(self, fragment):
        return [item for item in self.statements if fragment in item[0]]


@pytest.fixture
def fake_db(monkeypatch):
    connection = FakeConnection()

    def execute(conn, sql, params=None):
        conn.record(sql, params)
        return 1

    def query_one(conn, sql, params=None):
        conn.record(sql, params)
        for fragment, value in conn.responses.items():
            if fragment in " ".join(sql.split()):
                return value(params) if callable(value) else value
        return None

    def query_all(conn, sql, params=None):
        conn.record(sql, params)
        for fragment, value in conn.responses.items():
            if fragment in " ".join(sql.split()):
                return value(params) if callable(value) else value
        return []

    monkeypatch.setattr(jobs, "execute", execute)
    monkeypatch.setattr(jobs, "query_one", query_one)
    monkeypatch.setattr(jobs, "query_all", query_all)
    return connection


@pytest.fixture
def storage(tmp_path, monkeypatch):
    """Point the whole package at a temporary storage root."""
    monkeypatch.setattr(config, "STORAGE_PATH", tmp_path)
    monkeypatch.setattr(config, "DATA", tmp_path)
    return tmp_path


def write_spherex_fits(path, ra=266.4, dec=-29.0, size=32, seed=1):
    """A small SPHEREx-shaped product: image, variance and flags with a WCS."""
    rng = np.random.default_rng(seed)
    y, x = np.indices((size, size))
    image = rng.normal(10.0, 0.5, (size, size)) + 90.0 * np.exp(
        -((x - size / 2) ** 2 + (y - size / 2) ** 2) / 4.0
    )

    wcs = WCS(naxis=2)
    wcs.wcs.crpix = [size / 2, size / 2]
    # SPHEREx plate scale is 6.15 arcsec per pixel.
    wcs.wcs.cdelt = [-6.15 / 3600.0, 6.15 / 3600.0]
    wcs.wcs.crval = [ra, dec]
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]

    header = wcs.to_header()
    header["BUNIT"] = "MJy/sr"
    header["DATE-OBS"] = "2026-01-01T00:00:00"

    primary = fits.PrimaryHDU()
    primary.header["DATE-OBS"] = "2026-01-01T00:00:00"
    primary.header["DETECTOR"] = 5

    image_hdu = fits.ImageHDU(data=image.astype(np.float32), header=header, name="IMAGE")
    variance = fits.ImageHDU(data=np.full((size, size), 0.25, dtype=np.float32), name="VARIANCE")
    flags = fits.ImageHDU(data=np.zeros((size, size), dtype=np.uint32), name="FLAGS")

    fits.HDUList([primary, image_hdu, variance, flags]).writeto(path, overwrite=True)
    return path


PRODUCT = {
    "archive_id": "2026W39_1A_0289_1-D5",
    "obs_id": "2026W39_1A_0289_1",
    "collection": "spherex_qr3",
    "detector": 5,
    "band_number": 5,
    "bandpass": "SPHEREx-D5",
    "observation_date": datetime(2026, 9, 22, 6, 55, 46, tzinfo=timezone.utc),
    "observation_end": datetime(2026, 9, 22, 6, 57, 41, tzinfo=timezone.utc),
    "mjd_start": 61305.288728,
    "mjd_end": 61305.290060,
    "exposure_time_s": 113.58,
    "ra": 266.49,
    "dec": -28.32,
    "wavelength_min_um": 3.8113,
    "wavelength_max_um": 4.43,
    "spectral_resolving_power": 111.6,
    "access_url": (
        "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W39_1A/"
        "l2b-v27-2026-268/5/level2_2026W39_1A_0289_1D5_spx_l2b-v27-2026-268.fits"
    ),
    "access_format": "image/fits",
    "access_estsize_kb": 57062,
    "calib_level": 2,
    "dataproduct_type": "image",
    "dataproduct_subtype": "science",
    "instrument": "SPHEREx",
    "facility": "SPHEREx",
    "target_name": "SPS_109276_S34",
    "proposal_id": None,
    "publisher_did": "ivo://irsa.ipac/spherex_qr3?2026W39_1A_0289_1/D5",
    "s_region": "POLYGON ICRS 264 -26 268 -26 268 -30 264 -30 264 -26",
    "pixel_scale_arcsec": 6.15,
    "spatial_resolution_arcsec": 3.075,
    "fov_deg": 3.485,
    "width": 2040,
    "height": 2040,
    "release_date": "2026-10-28 22:18:56",
    "query_ra": 266.4,
    "query_dec": -29.0,
    "query_radius": 0.05,
}


def second_product():
    later = dict(PRODUCT)
    later["archive_id"] = "2026W40_1A_0301_1-D5"
    later["obs_id"] = "2026W40_1A_0301_1"
    later["observation_date"] = datetime(2026, 9, 29, 6, 55, 46, tzinfo=timezone.utc)
    return later


# --------------------------------------------------------------------------- #
# FETCH_OBSERVATIONS
# --------------------------------------------------------------------------- #

def test_fetch_observations_ingests_irsa_products(fake_db, storage, monkeypatch):
    progress = []
    cutouts = []

    monkeypatch.setattr(
        jobs.irsa, "search_products",
        lambda *args, **kwargs: [PRODUCT, second_product()],
    )

    def fake_download(access_url, ra, dec, size_deg=0.05, refresh=False):
        cutouts.append((access_url, ra, dec, size_deg))
        target = storage / "fits" / f"cutout-{len(cutouts)}.fits"
        target.parent.mkdir(parents=True, exist_ok=True)
        return write_spherex_fits(target, ra=ra, dec=dec)

    monkeypatch.setattr(jobs.irsa, "download_cutout", fake_download)

    result = jobs.handle_fetch_observations(
        {"ra": 266.4, "dec": -29.0, "radiusDeg": 0.05, "queryHash": "a" * 64},
        progress.append,
        fake_db,
    )

    assert result["status"] == "completed"
    assert result["products_discovered"] == 2
    assert result["observations_ingested"] == 2
    assert result["failures"] == []
    assert "IRSA" in result["source"]
    assert progress[-1] == 100

    # Both cutouts are centred on the requested position, not the frame centre,
    # so the two epochs cover the same patch of sky and can be differenced.
    assert all(ra == 266.4 and dec == -29.0 for _, ra, dec, _ in cutouts)

    inserts = fake_db.find("INSERT INTO observations")
    assert len(inserts) == 2

    _, params = inserts[0]
    (
        observation_id, archive_id, region_id, observation_date, ra, dec, band,
        wave_min, wave_max, archive_url, fits_path, preview_path, width, height,
        status, metadata,
    ) = params

    assert observation_id.startswith("obs-")
    assert archive_id == PRODUCT["archive_id"]
    assert region_id is None  # no sky_regions rows in the stub
    # MySQL DATETIME columns take naive UTC.
    assert observation_date.tzinfo is None
    assert observation_date.year == 2026
    assert band == 5
    assert wave_min == pytest.approx(3.8113, abs=1e-4)
    assert archive_url.startswith("https://irsa.ipac.caltech.edu/")
    assert fits_path.startswith("fits/")
    assert preview_path.startswith("previews/")
    assert width == 32 and height == 32
    assert status == "available"

    # The preview really was rendered from the FITS pixels.
    assert (storage / preview_path).exists()
    assert (storage / preview_path).stat().st_size > 0

    provenance = json.loads(metadata)
    assert provenance["archive"] == "NASA/IPAC IRSA"
    assert provenance["service"] == "SIA2"
    assert provenance["collection"] == "spherex_qr3"
    assert provenance["detector"] == 5
    assert provenance["cutout"]["service"] == "IRSA IBE"
    assert provenance["cutout"]["url"].startswith("https://irsa.ipac.caltech.edu/")
    assert provenance["image"]["unit"]

    # The query itself is recorded so repeat searches can be served from cache.
    archive_rows = fake_db.find("INSERT INTO archive_queries")
    assert len(archive_rows) == 1
    assert archive_rows[0][1][6] == 2  # result_count


def test_fetch_observations_is_idempotent_for_the_same_product(fake_db, storage, monkeypatch):
    monkeypatch.setattr(jobs.irsa, "search_products", lambda *a, **k: [PRODUCT])
    monkeypatch.setattr(
        jobs.irsa, "download_cutout",
        lambda url, ra, dec, size_deg=0.05, refresh=False: write_spherex_fits(
            (storage / "fits" / "c.fits").parent.mkdir(parents=True, exist_ok=True)
            or storage / "fits" / "c.fits", ra=ra, dec=dec
        ),
    )

    first = jobs.handle_fetch_observations({"ra": 266.4, "dec": -29.0}, lambda _: None, fake_db)
    second = jobs.handle_fetch_observations({"ra": 266.4, "dec": -29.0}, lambda _: None, fake_db)

    # The deterministic identifier means a re-run updates instead of duplicating.
    assert first["observation_ids"] == second["observation_ids"]
    statement, _ = fake_db.find("INSERT INTO observations")[0]
    assert "ON DUPLICATE KEY UPDATE" in statement


def test_fetch_observations_survives_one_unusable_product(fake_db, storage, monkeypatch):
    monkeypatch.setattr(jobs.irsa, "search_products", lambda *a, **k: [PRODUCT, second_product()])

    calls = {"n": 0}

    def flaky_download(access_url, ra, dec, size_deg=0.05, refresh=False):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ValueError("IRSA returned an empty cutout")
        target = storage / "fits" / "ok.fits"
        target.parent.mkdir(parents=True, exist_ok=True)
        return write_spherex_fits(target, ra=ra, dec=dec)

    monkeypatch.setattr(jobs.irsa, "download_cutout", flaky_download)

    result = jobs.handle_fetch_observations({"ra": 266.4, "dec": -29.0}, lambda _: None, fake_db)

    assert result["observations_ingested"] == 1
    assert len(result["failures"]) == 1
    assert "empty cutout" in result["failures"][0]["reason"]


def test_fetch_observations_reports_an_empty_archive_result(fake_db, storage, monkeypatch):
    monkeypatch.setattr(jobs.irsa, "search_products", lambda *a, **k: [])
    result = jobs.handle_fetch_observations({"ra": 10.0, "dec": 10.0}, lambda _: None, fake_db)

    assert result["observations_ingested"] == 0
    assert result["products_discovered"] == 0
    assert fake_db.find("INSERT INTO archive_queries")[0][1][5] == "empty"


def test_fetch_observations_links_a_matching_sky_region(fake_db, storage, monkeypatch):
    fake_db.responses["SELECT id, ra, `dec`, radius_deg FROM sky_regions"] = [
        {"id": "region-gc", "ra": 266.4, "dec": -29.0, "radius_deg": 0.25},
        {"id": "region-far", "ra": 10.0, "dec": 40.0, "radius_deg": 0.25},
    ]
    monkeypatch.setattr(jobs.irsa, "search_products", lambda *a, **k: [PRODUCT])
    monkeypatch.setattr(
        jobs.irsa, "download_cutout",
        lambda url, ra, dec, size_deg=0.05, refresh=False: write_spherex_fits(
            (storage / "fits").mkdir(parents=True, exist_ok=True) or storage / "fits" / "r.fits",
            ra=ra, dec=dec,
        ),
    )

    jobs.handle_fetch_observations({"ra": 266.4, "dec": -29.0}, lambda _: None, fake_db)
    _, params = fake_db.find("INSERT INTO observations")[0]
    assert params[2] == "region-gc"


# --------------------------------------------------------------------------- #
# IDENTIFY_OBJECTS
# --------------------------------------------------------------------------- #

OBSERVATION_B = {
    "id": "obs-b",
    "ra": 266.4,
    "dec": -29.0,
    "width": 32,
    "height": 32,
    "observation_date": datetime(2026, 1, 1, 0, 0, 0),
    # PyMySQL hands JSON columns back as strings; the job must cope.
    "metadata_json": json.dumps({"pixel_scale_arcsec": 6.15, "collection": "spherex_qr3"}),
}

CANDIDATES = [
    {
        "id": "cand-01", "x": 10.0, "y": 12.0,
        "ra": 266.402400, "dec": -29.073700,
        "change_type": "moving_object", "score": 88.0,
        "metadata_json": json.dumps({"possible_class": "Moving object candidate"}),
    },
    {
        "id": "cand-02", "x": 20.0, "y": 22.0,
        "ra": 100.0, "dec": 10.0,
        "change_type": "brightness_change", "score": 70.0,
        "metadata_json": None,
    },
]

SB_IDENT_OBJECTS = [
    {
        "name": "161731 (2006 SG36)",
        "designation": "161731",
        "ra": 266.402375,
        "dec": -29.07375,
        "offset_arcsec": 265.6,
        "apparent_magnitude": 20.7,
        "ra_rate_arcsec_per_hour": 63.9,
        "dec_rate_arcsec_per_hour": -5.915,
        "motion_arcsec_per_hour": 64.17,
        "position_uncertainty_arcsec": None,
        "epoch_utc": "2026-01-01T00:00:00+00:00",
        "pass": "second",
        "source": "NASA/JPL Small-Body Identification",
    }
]

ORBIT = {
    "designation": "161731",
    "full_name": "161731 (2006 SG36)",
    "orbit_class": "Main-belt Asteroid",
    "neo": False,
    "elements": {"a": {"value": 2.76}, "e": {"value": 0.13}},
}


def identify_db(fake_db):
    fake_db.responses.update({
        "SELECT * FROM comparisons WHERE id": {
            "id": "comp-1", "observation_a_id": "obs-a", "observation_b_id": "obs-b",
            "status": "completed",
        },
        "SELECT * FROM observations WHERE id": OBSERVATION_B,
        "FROM change_candidates WHERE comparison_id": CANDIDATES,
        "SELECT metadata_json FROM change_candidates WHERE id": lambda params: next(
            (c for c in CANDIDATES if c["id"] == params[0]), None
        ),
    })
    return fake_db


def test_identify_objects_records_jpl_matches(fake_db, monkeypatch):
    identify_db(fake_db)
    requests = []

    def fake_identify(ra, dec, half_width, epoch, vmag_limit=22, two_pass=True):
        requests.append((ra, dec, half_width, epoch, vmag_limit, two_pass))
        return SB_IDENT_OBJECTS

    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", fake_identify)
    monkeypatch.setattr(jobs.jpl, "small_body", lambda designation, **kwargs: ORBIT)

    result = jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)

    assert result["status"] == "completed"
    assert result["objectsInField"] == 1
    assert result["candidatesExamined"] == 2
    assert len(result["identifications"]) == 1
    assert result["identifications"][0]["designation"] == "161731"
    assert result["identifications"][0]["separationArcsec"] < 2.0
    assert result["identifications"][0]["orbitClass"] == "Main-belt Asteroid"

    # The field asked of JPL is centred on the later observation and covers it.
    ra, dec, half_width, epoch, vmag, two_pass = requests[0]
    assert (ra, dec) == (266.4, -29.0)
    assert two_pass is True
    assert half_width >= 32 * 6.15 / 3600.0 / 2
    assert epoch.tzinfo is timezone.utc

    # Old identifications are cleared before new ones are written.
    assert fake_db.find("DELETE FROM moving_object_matches")

    inserts = fake_db.find("INSERT INTO moving_object_matches")
    assert len(inserts) == 1
    params = inserts[0][1]
    assert params[1] == "comp-1"
    assert params[2] == "cand-01"
    assert params[3] == "161731 (2006 SG36)"
    assert json.loads(params[15])["orbit_class"] == "Main-belt Asteroid"

    # The candidate keeps its own classification and gains the identification
    # alongside it, so the two opinions stay separable.
    updates = fake_db.find("UPDATE change_candidates SET metadata_json")
    assert len(updates) == 1
    metadata = json.loads(updates[0][1][0])
    assert metadata["possible_class"] == "Moving object candidate"
    assert metadata["solar_system_identification"]["designation"] == "161731"
    assert metadata["solar_system_identification"]["object_name"] == "161731 (2006 SG36)"
    assert metadata["solar_system_identification"]["source"] == "NASA/JPL"
    assert metadata["solar_system_identification"]["orbit_class"] == "Main-belt Asteroid"


def test_identify_objects_tolerates_a_failed_sbdb_lookup(fake_db, monkeypatch):
    identify_db(fake_db)
    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", lambda *a, **k: SB_IDENT_OBJECTS)

    def failing_lookup(designation, **kwargs):
        raise jobs.jpl.JPLError("SBDB is unavailable")

    monkeypatch.setattr(jobs.jpl, "small_body", failing_lookup)

    result = jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)

    # The identification still lands; only the orbit block is missing.
    assert len(result["identifications"]) == 1
    assert result["identifications"][0]["orbitClass"] is None
    assert fake_db.find("INSERT INTO moving_object_matches")[0][1][15] is None


def test_identify_objects_records_nothing_when_the_field_is_empty(fake_db, monkeypatch):
    identify_db(fake_db)
    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", lambda *a, **k: [])

    result = jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)

    assert result["objectsInField"] == 0
    assert result["identifications"] == []
    assert fake_db.find("INSERT INTO moving_object_matches") == []


def test_identify_objects_clears_a_stale_identification(fake_db, monkeypatch):
    """A re-run that no longer matches must not leave the old answer behind."""
    stale = [
        {
            **CANDIDATES[0],
            "metadata_json": json.dumps({
                "possible_class": "Known solar-system body: 161731 (2006 SG36)",
                "solar_system_identification": {"object_name": "161731 (2006 SG36)"},
            }),
        }
    ]
    fake_db.responses.update({
        "SELECT * FROM comparisons WHERE id": {
            "id": "comp-1", "observation_a_id": "obs-a", "observation_b_id": "obs-b",
            "status": "completed",
        },
        "SELECT * FROM observations WHERE id": OBSERVATION_B,
        "FROM change_candidates WHERE comparison_id": stale,
    })
    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", lambda *a, **k: [])

    jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)

    updates = fake_db.find("UPDATE change_candidates SET metadata_json")
    assert len(updates) == 1
    metadata = json.loads(updates[0][1][0])
    assert "solar_system_identification" not in metadata
    # The rewritten possible_class from the old run is removed too.
    assert "possible_class" not in metadata


def test_identify_objects_leaves_unrelated_candidate_metadata_alone(fake_db, monkeypatch):
    untouched = [{**CANDIDATES[1], "metadata_json": json.dumps({"flux_sigma": 4.2})}]
    fake_db.responses.update({
        "SELECT * FROM comparisons WHERE id": {
            "id": "comp-1", "observation_a_id": "obs-a", "observation_b_id": "obs-b",
            "status": "completed",
        },
        "SELECT * FROM observations WHERE id": OBSERVATION_B,
        "FROM change_candidates WHERE comparison_id": untouched,
    })
    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", lambda *a, **k: [])

    jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)

    assert fake_db.find("UPDATE change_candidates SET metadata_json") == []


def test_identify_objects_requires_a_known_comparison(fake_db):
    with pytest.raises(ValueError, match="Comparison not found"):
        jobs.handle_identify_objects({"comparisonId": "missing"}, lambda _: None, fake_db)


def test_identify_objects_requires_an_epoch(fake_db, monkeypatch):
    identify_db(fake_db)
    fake_db.responses["SELECT * FROM observations WHERE id"] = {
        **OBSERVATION_B, "observation_date": None
    }
    monkeypatch.setattr(jobs.jpl, "identify_moving_objects", lambda *a, **k: [])
    with pytest.raises(ValueError, match="observation date"):
        jobs.handle_identify_objects({"comparisonId": "comp-1"}, lambda _: None, fake_db)


def test_queue_identify_objects_reuses_a_pending_job(fake_db):
    fake_db.responses["SELECT id FROM processing_jobs"] = {"id": "job-existing"}
    assert jobs.queue_identify_objects(fake_db, "comp-1") == "job-existing"
    assert fake_db.find("INSERT INTO processing_jobs") == []


def test_queue_identify_objects_creates_a_job_when_none_is_pending(fake_db):
    job_id = jobs.queue_identify_objects(fake_db, "comp-1")
    assert job_id.startswith("job-identify-")
    inserts = fake_db.find("INSERT INTO processing_jobs")
    assert len(inserts) == 1
    assert json.loads(inserts[0][1][2])["comparisonId"] == "comp-1"


def test_decode_json_handles_every_shape_mysql_returns():
    assert decode_json('{"a": 1}') == {"a": 1}
    assert decode_json(b'{"a": 1}') == {"a": 1}
    assert decode_json({"a": 1}) == {"a": 1}
    assert decode_json(None, {}) == {}
    assert decode_json("not json", {"fallback": True}) == {"fallback": True}
    assert decode_json(encode_json({"round": "trip"})) == {"round": "trip"}
