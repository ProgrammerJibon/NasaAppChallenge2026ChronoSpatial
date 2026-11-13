"""Offline tests for the NASA/IPAC IRSA SIA2 integration."""

from datetime import timezone

import pytest

from spherex import irsa
from spherex.irsa import (
    COLLECTIONS,
    checked_url,
    cutout_url,
    detector_from_bandpass,
    mjd_to_datetime,
    normalize_product,
    prune_cache,
    query,
)

# One real row from the IRSA SIA2 ObsCore response for the Galactic centre.
IRSA_ROW = {
    "s_ra": 266.49199582120877,
    "s_dec": -28.324102637803755,
    "facility_name": "SPHEREx",
    "instrument_name": "SPHEREx",
    "dataproduct_subtype": "science",
    "calib_level": 2,
    "dataproduct_type": "image",
    "energy_bandpassname": "SPHEREx-D5",
    "obs_id": "2026W39_1A_0289_1",
    "s_resolution": 3.075,
    "em_min": 3.81130e-06,
    "em_max": 4.43000e-06,
    "em_res_power": 111.6,
    "access_url": (
        "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W39_1A/"
        "l2b-v27-2026-268/5/level2_2026W39_1A_0289_1D5_spx_l2b-v27-2026-268.fits"
    ),
    "access_format": "image/fits",
    "access_estsize": 57062,
    "t_exptime": 113.5826,
    "obs_collection": "spherex_qr3",
    "obs_publisher_did": "ivo://irsa.ipac/spherex_qr3?2026W39_1A_0289_1/D5",
    "s_xel1": 2040,
    "s_xel2": 2040,
    "s_pixel_scale": 6.150,
    "t_min": 61305.288728,
    "t_max": 61305.290060,
    "obs_release_date": "2026-10-28 22:18:56",
    "archive_collection": "spherex_qr3",
}


def test_checked_url_accepts_valid_irsa_https():
    url = "https://irsa.ipac.caltech.edu/ibe/data/spherex/test.fits"
    assert checked_url(url) == url


def test_checked_url_rejects_insecure_or_external_hosts():
    with pytest.raises(ValueError):
        checked_url("http://irsa.ipac.caltech.edu/test.fits")

    with pytest.raises(ValueError):
        checked_url("https://malicious-site.example.com/test.fits")

    with pytest.raises(ValueError):
        checked_url("https://user@irsa.ipac.caltech.edu/test.fits")

    with pytest.raises(ValueError):
        checked_url("https://irsa.ipac.caltech.edu.evil.example/test.fits")


def test_query_rejects_invalid_coordinates():
    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=400.0, dec=0.0, radius=0.1)

    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=100.0, dec=-95.0, radius=0.1)

    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=100.0, dec=0.0, radius=2.5)  # radius > 1.0


def test_query_rejects_unknown_collection():
    with pytest.raises(ValueError, match="Unknown SPHEREx collection"):
        query(ra=100.0, dec=0.0, radius=0.1, collection="spherex_qr2")


def test_collection_set_matches_the_live_service():
    # Verified against the COLLECTION options the IRSA SIA2 service advertises.
    assert COLLECTIONS == {
        "spherex_dr1",
        "spherex_dr1_cube",
        "spherex_dr1_deep",
        "spherex_qr3",
        "spherex_qr3_deep",
    }


def test_detector_from_bandpass():
    assert detector_from_bandpass("SPHEREx-D5") == 5
    assert detector_from_bandpass("SPHEREx-D1") == 1
    assert detector_from_bandpass("SPHEREx-D6") == 6
    # Unknown or out-of-range labels fall back to detector 1 rather than failing.
    assert detector_from_bandpass("SPHEREx-D9") == 1
    assert detector_from_bandpass(None) == 1
    assert detector_from_bandpass("Infrared") == 1


def test_mjd_to_datetime():
    # MJD 51544.5 is the J2000.0 epoch, 2000-01-01T12:00:00 UTC.
    j2000 = mjd_to_datetime(51544.5)
    assert j2000.tzinfo == timezone.utc
    assert j2000.isoformat().startswith("2000-01-01T12:00:00")

    assert mjd_to_datetime(None) is None
    assert mjd_to_datetime(0) is None
    assert mjd_to_datetime("not a number") is None


def test_normalize_product_maps_obscore_onto_platform_schema():
    product = normalize_product(IRSA_ROW)

    assert product["archive_id"] == "2026W39_1A_0289_1-D5"
    assert product["band_number"] == 5
    assert product["detector"] == 5
    assert product["collection"] == "spherex_qr3"
    # ObsCore spectral bounds are metres; the platform stores micrometres.
    assert product["wavelength_min_um"] == pytest.approx(3.8113, abs=1e-4)
    assert product["wavelength_max_um"] == pytest.approx(4.43, abs=1e-4)
    assert product["observation_date"].isoformat().startswith("2026-09-22T06:55:46")
    assert product["ra"] == pytest.approx(266.491996, abs=1e-5)
    assert product["width"] == 2040
    assert product["pixel_scale_arcsec"] == pytest.approx(6.15, abs=0.01)
    assert product["access_url"].startswith("https://irsa.ipac.caltech.edu/")


def test_normalize_product_rejects_foreign_or_missing_access_urls():
    with pytest.raises(ValueError):
        normalize_product({**IRSA_ROW, "access_url": None})

    with pytest.raises(ValueError):
        normalize_product({**IRSA_ROW, "access_url": "https://example.com/data.fits"})

    with pytest.raises(ValueError, match="observation epoch"):
        normalize_product({**IRSA_ROW, "t_min": None})


def test_cutout_url_is_bounded_and_host_pinned():
    url = cutout_url(IRSA_ROW["access_url"], 266.4, -29.0, 0.05)
    assert url.startswith("https://irsa.ipac.caltech.edu/")
    assert "center=266.400000%2C-29.000000" in url
    assert "size=0.050000" in url

    with pytest.raises(ValueError):
        cutout_url("https://example.com/a.fits", 266.4, -29.0, 0.05)
    with pytest.raises(ValueError):
        cutout_url(IRSA_ROW["access_url"], 400.0, -29.0, 0.05)
    with pytest.raises(ValueError, match="Cutout size"):
        cutout_url(IRSA_ROW["access_url"], 266.4, -29.0, 5.0)
    with pytest.raises(ValueError, match="Cutout size"):
        cutout_url(IRSA_ROW["access_url"], 266.4, -29.0, 0.0)


def test_cutout_url_is_stable_for_the_same_region():
    a = cutout_url(IRSA_ROW["access_url"], 266.4, -29.0, 0.05)
    b = cutout_url(IRSA_ROW["access_url"], 266.4000001, -29.0000001, 0.05)
    # Content addressing depends on this: the same region must produce the same
    # URL so the cutout is downloaded once.
    assert a == b


def test_prune_cache_evicts_oldest_files_first(tmp_path, monkeypatch):
    monkeypatch.setattr(irsa, "DATA", tmp_path)
    directory = tmp_path / "fits"
    directory.mkdir()

    import os, time

    for index in range(4):
        path = directory / f"file-{index}.fits"
        path.write_bytes(b"x" * 1000)
        os.utime(path, (time.time() - (10 - index) * 60,) * 2)

    removed = irsa.prune_cache("fits", budget=2500)
    assert removed == 2
    remaining = sorted(p.name for p in directory.iterdir())
    # The two most recently touched files survive.
    assert remaining == ["file-2.fits", "file-3.fits"]


def test_prune_cache_removes_abandoned_partial_downloads(tmp_path, monkeypatch):
    import os, time

    monkeypatch.setattr(irsa, "DATA", tmp_path)
    directory = tmp_path / "fits"
    directory.mkdir()

    stale = directory / "abandoned.part"
    stale.write_bytes(b"x" * 100)
    os.utime(stale, (time.time() - 2 * irsa.PARTIAL_DOWNLOAD_TTL,) * 2)

    fresh = directory / "in-flight.part"
    fresh.write_bytes(b"x" * 100)

    keep = directory / "good.fits"
    keep.write_bytes(b"x" * 100)

    irsa.prune_cache("fits", budget=10_000)

    assert not stale.exists()
    # A download that is still running must survive.
    assert fresh.exists()
    assert keep.exists()


def test_prune_cache_is_a_no_op_within_budget(tmp_path, monkeypatch):
    monkeypatch.setattr(irsa, "DATA", tmp_path)
    directory = tmp_path / "fits"
    directory.mkdir()
    (directory / "only.fits").write_bytes(b"x" * 10)
    assert irsa.prune_cache("fits", budget=10_000) == 0
    assert (directory / "only.fits").exists()
