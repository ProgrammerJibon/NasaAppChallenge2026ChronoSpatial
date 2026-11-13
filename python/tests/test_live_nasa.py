"""Live end-to-end tests against the real NASA archives.

These confirm that the requests the worker sends are the ones NASA accepts and
that the science coming back is sound: IRSA cutouts land on the sky position
that was asked for, and the JPL Small-Body Identification service agrees with
an independent Horizons ephemeris to well inside one SPHEREx pixel.

Set ``SKIP_LIVE_NASA_TESTS=1`` to skip them when running without network access.
Responses are cached under ``storage/cache``, so repeat runs are fast.
"""

import os
from datetime import datetime, timezone

import numpy as np
import pytest

from spherex import irsa, jpl
from spherex.fits import get_plane_metadata, read_fits

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_LIVE_NASA_TESTS") == "1",
    reason="SKIP_LIVE_NASA_TESTS=1",
)

# A Galactic-centre field with dense SPHEREx coverage and known minor planets.
FIELD_RA, FIELD_DEC = 266.4, -29.0
EPOCH = datetime(2026, 1, 1, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def products():
    found = irsa.search_products(FIELD_RA, FIELD_DEC, 0.05, limit=25)
    if not found:
        pytest.skip("IRSA returned no SPHEREx products for the test field")
    return found


# --------------------------------------------------------------------------- #
# NASA/IPAC IRSA
# --------------------------------------------------------------------------- #

def test_sia2_discovery_returns_usable_spherex_products(products):
    assert len(products) > 0

    for product in products:
        assert product["access_url"].startswith("https://irsa.ipac.caltech.edu/")
        assert 1 <= product["band_number"] <= 6
        assert product["collection"] in irsa.COLLECTIONS
        # SPHEREx covers 0.75-5.0 micrometres across its six detectors.
        assert 0.6 < product["wavelength_min_um"] < product["wavelength_max_um"] < 5.5
        assert product["observation_date"].tzinfo is not None
        assert product["pixel_scale_arcsec"] == pytest.approx(6.15, abs=0.1)
        # Every product must genuinely cover the queried position.
        separation = jpl.angular_separation_arcsec(
            FIELD_RA, FIELD_DEC, product["ra"], product["dec"]
        ) / 3600.0
        assert separation < 3.5

    dates = [product["observation_date"] for product in products]
    assert dates == sorted(dates)

    identifiers = [product["archive_id"] for product in products]
    assert len(identifiers) == len(set(identifiers))


def test_band_filter_selects_a_single_detector():
    filtered = irsa.search_products(FIELD_RA, FIELD_DEC, 0.05, limit=10, band=3)
    for product in filtered:
        assert product["band_number"] == 3
        assert product["bandpass"] == "SPHEREx-D3"


def test_ibe_cutout_downloads_and_parses_as_real_spherex_science(products, tmp_path):
    product = products[0]
    path = irsa.download_cutout(product["access_url"], FIELD_RA, FIELD_DEC, 0.05)

    assert path.exists()
    assert path.suffix == ".fits"
    assert path.stat().st_size > 0
    assert path.stat().st_size <= irsa.MAX_DOWNLOAD

    plane = read_fits(path)
    metadata = get_plane_metadata(plane)

    # The cutout must be centred on the position that was requested.
    offset = jpl.angular_separation_arcsec(
        FIELD_RA, FIELD_DEC, metadata["ra"], metadata["dec"]
    )
    assert offset < 10.0  # under two SPHEREx pixels

    # 0.05 degrees at 6.15 arcsec per pixel is about 29 pixels on a side.
    assert 20 <= metadata["width"] <= 40
    assert 20 <= metadata["height"] <= 40
    assert metadata["valid_fraction"] > 0.1
    assert metadata["has_variance"] is True
    assert "MJy" in str(metadata["unit"])
    assert np.isfinite(plane.image).any()

    # SPHEREx is a spectral survey: the linear variable filter must give the
    # wavelength sampled at the centre of the cutout.
    assert metadata["wavelength_um"] is not None
    assert 0.6 < metadata["wavelength_um"] < 5.5
    assert product["wavelength_min_um"] - 0.3 <= metadata["wavelength_um"] <= product["wavelength_max_um"] + 0.3


def test_cutouts_are_content_addressed(products):
    product = products[0]
    first = irsa.download_cutout(product["access_url"], FIELD_RA, FIELD_DEC, 0.05)
    second = irsa.download_cutout(product["access_url"], FIELD_RA, FIELD_DEC, 0.05)
    # The same region resolves to the same cached file rather than re-downloading.
    assert first == second

    different = irsa.download_cutout(product["access_url"], FIELD_RA + 0.01, FIELD_DEC, 0.05)
    assert different != first


def test_cutout_rejects_an_oversized_request(products):
    with pytest.raises(ValueError, match="Cutout size"):
        irsa.download_cutout(products[0]["access_url"], FIELD_RA, FIELD_DEC, 5.0)


# --------------------------------------------------------------------------- #
# NASA JPL
# --------------------------------------------------------------------------- #

def test_sbdb_returns_the_published_orbit_of_433_eros():
    body = jpl.small_body("433")

    assert "Eros" in body["full_name"]
    assert body["orbit_class"] == "Amor"
    assert body["neo"] is True
    # 433 Eros: a = 1.4582 au, e = 0.2229, i = 10.83 deg, H = 10.4.
    assert body["elements"]["a"]["value"] == pytest.approx(1.4582, abs=1e-3)
    assert body["elements"]["e"]["value"] == pytest.approx(0.2229, abs=1e-3)
    assert body["elements"]["i"]["value"] == pytest.approx(10.83, abs=0.1)
    assert body["physical_parameters"]["H"]["value"] == pytest.approx(10.4, abs=0.1)
    # The Small-Body Database numbers a minor planet as 20000000 + its number.
    assert str(body["spk_id"]) == "20000433"


def test_sbdb_reports_an_unknown_designation_clearly():
    with pytest.raises((jpl.JPLError, ValueError)):
        jpl.small_body("definitely-not-a-minor-planet")


def test_horizons_single_epoch_ephemeris_is_physically_consistent():
    row = jpl.predicted_position("433", EPOCH)

    assert row["time_utc"].startswith("2026-01-01T00:00:00")
    assert 0 <= row["ra_deg"] < 360
    assert -90 <= row["dec_deg"] <= 90
    # Eros stays within roughly 1.1-1.8 au of the Sun.
    assert 1.0 < row["heliocentric_distance_au"] < 2.0
    assert row["observer_distance_au"] > 0
    assert row["motion_arcsec_per_hour"] > 0
    assert row["source"] == "NASA/JPL Horizons"


def test_horizons_stepped_ephemeris_rates_match_the_positions():
    rows = jpl.horizons_ephemeris(
        "433", start="2026-01-01T00:00:00Z", stop="2026-01-03T00:00:00Z", step="1 d"
    )
    assert len(rows) == 3

    first, second = rows[0], rows[1]
    measured = jpl.angular_separation_arcsec(
        first["ra_deg"], first["dec_deg"], second["ra_deg"], second["dec_deg"]
    )
    predicted = (
        (first["motion_arcsec_per_hour"] + second["motion_arcsec_per_hour"]) / 2.0
    ) * 24.0
    assert measured > 0
    assert abs(measured - predicted) / measured < 0.05


def test_horizons_rejects_an_unknown_target():
    with pytest.raises(jpl.JPLError):
        jpl.predicted_position("not-a-real-object-xyz", EPOCH)


def test_sb_ident_finds_minor_planets_and_agrees_with_horizons():
    objects = jpl.identify_moving_objects(
        FIELD_RA, FIELD_DEC, 0.15, EPOCH, vmag_limit=22, two_pass=True
    )
    assert len(objects) > 0

    boundary = 0.15 * 3600.0 * 2 ** 0.5
    for obj in objects:
        assert obj["name"]
        assert 0 <= obj["ra"] < 360
        assert -90 <= obj["dec"] <= 90
        assert obj["apparent_magnitude"] <= 22
        assert obj["pass"] == "second"
        # Everything returned must genuinely sit inside the requested box.
        assert jpl.angular_separation_arcsec(FIELD_RA, FIELD_DEC, obj["ra"], obj["dec"]) <= boundary + 1

    # Scientific cross-validation between two independent JPL services: the
    # position sb_ident reports must match the Horizons ephemeris for the same
    # instant to well inside one SPHEREx pixel (6.15 arcsec).
    target = objects[0]
    ephemeris = jpl.predicted_position(target["designation"], EPOCH)
    separation = jpl.angular_separation_arcsec(
        target["ra"], target["dec"], ephemeris["ra_deg"], ephemeris["dec_deg"]
    )
    assert separation < 2.0
    assert target["motion_arcsec_per_hour"] == pytest.approx(
        ephemeris["motion_arcsec_per_hour"], rel=0.05
    )


def test_identified_objects_cross_match_back_onto_candidates():
    objects = jpl.identify_moving_objects(
        FIELD_RA, FIELD_DEC, 0.15, EPOCH, vmag_limit=22, two_pass=True
    )
    if not objects:
        pytest.skip("No minor planets in the test field at this epoch")

    # Build a candidate exactly where JPL says the body is, plus a decoy.
    target = objects[0]
    candidates = [
        {"id": "cand-real", "ra": target["ra"], "dec": target["dec"]},
        {"id": "cand-decoy", "ra": (target["ra"] + 1.0) % 360, "dec": target["dec"]},
    ]
    matches = jpl.match_moving_objects(candidates, objects, tolerance_arcsec=10.0)

    assert len(matches) == 1
    assert matches[0]["candidate_id"] == "cand-real"
    assert matches[0]["object"]["name"] == target["name"]
    assert matches[0]["separation_arcsec"] < 1.0


# --------------------------------------------------------------------------- #
# Combined IRSA + JPL workflow
# --------------------------------------------------------------------------- #

def test_identification_runs_at_a_real_spherex_observation_epoch(products):
    """The epoch IRSA reports must be one JPL can produce an ephemeris for."""
    product = products[0]
    epoch = product["observation_date"]

    objects = jpl.identify_moving_objects(
        float(product["ra"]), float(product["dec"]), 0.1, epoch, vmag_limit=20, two_pass=True
    )
    assert isinstance(objects, list)

    for obj in objects:
        assert obj["epoch_utc"].startswith(epoch.strftime("%Y-%m-%dT%H:%M:%S"))
        ephemeris = jpl.predicted_position(obj["designation"], epoch)
        separation = jpl.angular_separation_arcsec(
            obj["ra"], obj["dec"], ephemeris["ra_deg"], ephemeris["dec_deg"]
        )
        assert separation < 6.15  # inside one SPHEREx pixel
        break
