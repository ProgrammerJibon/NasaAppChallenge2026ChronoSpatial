"""Offline tests for the NASA JPL Solar System Dynamics integration."""

import math

import pytest

from spherex.jpl import (
    JPLError,
    angular_separation_arcsec,
    checked_url,
    designation_from_name,
    format_dec_sexagesimal,
    format_ra_sexagesimal,
    identify_moving_objects,
    match_moving_objects,
    parse_dec_sexagesimal,
    parse_ra_sexagesimal,
    _parse_horizons_result,
)

# Verbatim excerpt of a real Horizons CSV response for asteroid 2006 SG36.
HORIZONS_RESULT = "\n".join([
    "*******************************************************************",
    " Date__(UT)__HR:MN:SC.fff, , , R.A.___(ICRF), DEC____(ICRF),  dRA*cosD, d(DEC)/dt,"
    "    APmag,  S-brt,                r,       rdot,             delta,     deldot,"
    "     S-O-T,/r,     S-T-O,",
    "*******************************************************************",
    "$$SOE",
    " 2026-Jan-01 00:00:00.000, , , 266.402384172, -29.073755771,  63.91766,  -5.73310,"
    "   20.698,  6.022,   2.763570691292, -0.8059963,  3.70456213236882, -6.3765749,"
    "   14.5042,/L,    5.1106,",
    " 2026-Jan-02 00:00:00.000, , , 266.838811234, -29.112344556,  64.10000,  -5.70000,"
    "   20.700,  6.023,   2.761000000000, -0.8000000,  3.70000000000000, -6.3000000,"
    "   14.0000,/L,    5.2000,",
    "$$EOE",
    "*******************************************************************",
])


def test_checked_url_allows_only_jpl_ssd_hosts():
    assert checked_url("https://ssd.jpl.nasa.gov/api/horizons.api")
    assert checked_url("https://ssd-api.jpl.nasa.gov/sbdb.api")

    with pytest.raises(ValueError):
        checked_url("http://ssd-api.jpl.nasa.gov/sbdb.api")
    with pytest.raises(ValueError):
        checked_url("https://evil.example.com/sbdb.api")
    with pytest.raises(ValueError):
        checked_url("https://ssd-api.jpl.nasa.gov.evil.example/sbdb.api")


def test_format_ra_matches_sb_ident_syntax():
    assert format_ra_sexagesimal(266.4) == "17-45-36.00"
    assert format_ra_sexagesimal(0.0) == "00-00-00.00"
    assert format_ra_sexagesimal(180.0) == "12-00-00.00"
    with pytest.raises(ValueError):
        format_ra_sexagesimal(360.0)


def test_format_dec_uses_the_m_for_minus_convention():
    assert format_dec_sexagesimal(-29.0) == "M29-00-00.0"
    assert format_dec_sexagesimal(27.128333) == "27-07-42.0"
    assert format_dec_sexagesimal(0.0) == "00-00-00.0"
    with pytest.raises(ValueError):
        format_dec_sexagesimal(-91.0)


def test_sexagesimal_round_trip():
    assert parse_ra_sexagesimal("17:45:36.00") == pytest.approx(266.4, abs=1e-6)
    assert parse_dec_sexagesimal("-29 00'00.0\"") == pytest.approx(-29.0, abs=1e-6)
    assert parse_dec_sexagesimal("M29-00-00.0") == pytest.approx(-29.0, abs=1e-6)
    assert parse_dec_sexagesimal("+12 30'00\"") == pytest.approx(12.5, abs=1e-6)
    # The exact shapes sb_ident returns.
    assert parse_ra_sexagesimal("17:45:54.26") == pytest.approx(266.476083, abs=1e-5)
    assert parse_dec_sexagesimal("-28 55'02.5\"") == pytest.approx(-28.917361, abs=1e-5)

    for degrees in (0.0, 12.5, -45.75, 89.999, -89.999):
        assert parse_dec_sexagesimal(format_dec_sexagesimal(degrees).replace("M", "-")) == pytest.approx(
            degrees, abs=0.05 / 3600
        )


def test_parse_dec_rejects_unparsable_values():
    with pytest.raises(ValueError):
        parse_dec_sexagesimal("not a declination")


def test_angular_separation_is_accurate_at_small_angles():
    assert angular_separation_arcsec(10, 20, 10, 20) == pytest.approx(0.0, abs=1e-9)
    assert angular_separation_arcsec(10, 20, 10, 20 + 1 / 3600) == pytest.approx(1.0, abs=1e-6)
    # One arcsecond of RA at declination 60 is half an arcsecond on the sky.
    assert angular_separation_arcsec(10, 60, 10 + 1 / 3600, 60) == pytest.approx(0.5, abs=1e-4)
    assert angular_separation_arcsec(0, 0, 180, 0) == pytest.approx(180 * 3600, abs=1e-3)
    # Wrap-around across RA 0 must not inflate the separation.
    assert angular_separation_arcsec(359.999, 0, 0.001, 0) == pytest.approx(0.002 * 3600, abs=1e-3)


def test_designation_from_name():
    assert designation_from_name("69372 (1994 UA6)") == "69372"
    assert designation_from_name("433 Eros (A898 PA)") == "433"
    assert designation_from_name("(1927 LA)") == "1927 LA"
    assert designation_from_name("  C/2019 Y4  ") == "C/2019 Y4"
    with pytest.raises(ValueError):
        designation_from_name("   ")


def test_parse_horizons_result_extracts_every_column():
    rows = _parse_horizons_result(HORIZONS_RESULT)
    assert len(rows) == 2

    first = rows[0]
    assert first["time_utc"].startswith("2026-01-01T00:00:00")
    assert first["ra_deg"] == pytest.approx(266.402384172, abs=1e-9)
    assert first["dec_deg"] == pytest.approx(-29.073755771, abs=1e-9)
    assert first["ra_rate_arcsec_per_hour"] == pytest.approx(63.91766, abs=1e-5)
    assert first["dec_rate_arcsec_per_hour"] == pytest.approx(-5.7331, abs=1e-4)
    assert first["motion_arcsec_per_hour"] == pytest.approx(math.hypot(63.91766, -5.7331), abs=1e-6)
    assert first["apparent_magnitude"] == pytest.approx(20.698, abs=1e-3)
    assert first["heliocentric_distance_au"] == pytest.approx(2.763570691292, abs=1e-10)
    assert first["observer_distance_au"] == pytest.approx(3.70456213236882, abs=1e-10)
    # The `/L` sub-column must not be mistaken for the solar elongation.
    assert first["solar_elongation_deg"] == pytest.approx(14.5042, abs=1e-4)
    assert first["phase_angle_deg"] == pytest.approx(5.1106, abs=1e-4)


def test_parse_horizons_result_handles_the_lower_precision_header():
    plain = (
        HORIZONS_RESULT
        .replace("R.A.___(ICRF), DEC____(ICRF)", "R.A._(ICRF), DEC_(ICRF)")
        .replace("Date__(UT)__HR:MN:SC.fff", "Date__(UT)__HR:MN")
        .replace("2026-Jan-01 00:00:00.000", "2026-Jan-01 00:00")
        .replace("2026-Jan-02 00:00:00.000", "2026-Jan-02 00:00")
    )
    rows = _parse_horizons_result(plain)
    assert len(rows) == 2
    assert rows[0]["time_utc"].startswith("2026-01-01T00:00:00")
    assert rows[0]["ra_deg"] == pytest.approx(266.402384172, abs=1e-9)


def test_parse_horizons_result_reports_unresolved_targets():
    with pytest.raises(JPLError, match="could not resolve"):
        _parse_horizons_result("No matches found for '999999999'")
    with pytest.raises(JPLError):
        _parse_horizons_result("unrelated text with no ephemeris")


def test_identify_rejects_fields_the_service_cannot_refine():
    with pytest.raises(ValueError, match="half-width"):
        identify_moving_objects(266.4, -29.0, 10.0, "2026-01-01T00:00:00Z")
    with pytest.raises(ValueError, match="field centre"):
        identify_moving_objects(400.0, -29.0, 0.1, "2026-01-01T00:00:00Z")
    with pytest.raises(ValueError, match="half-width"):
        identify_moving_objects(266.4, -29.0, 0.0, "2026-01-01T00:00:00Z")


OBJECTS = [
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
    },
    {
        "name": "69372 (1994 UA6)",
        "designation": "69372",
        "ra": 266.476083,
        "dec": -28.917361,
        "offset_arcsec": 382.0,
        "apparent_magnitude": 20.7,
        "ra_rate_arcsec_per_hour": 54.93,
        "dec_rate_arcsec_per_hour": -3.499,
        "motion_arcsec_per_hour": 55.04,
    },
]


def test_match_moving_objects_attaches_the_nearest_body():
    candidates = [
        {"id": "cand-01", "ra": 266.402400, "dec": -29.073700},   # ~0.1 arcsec away
        {"id": "cand-02", "ra": 266.476100, "dec": -28.917400},   # ~0.15 arcsec away
        {"id": "cand-03", "ra": 100.0, "dec": 10.0},              # nowhere near
    ]
    matches = match_moving_objects(candidates, OBJECTS, tolerance_arcsec=60.0)

    assert len(matches) == 2
    by_candidate = {match["candidate_id"]: match for match in matches}
    assert by_candidate["cand-01"]["object"]["designation"] == "161731"
    assert by_candidate["cand-02"]["object"]["designation"] == "69372"
    assert by_candidate["cand-01"]["separation_arcsec"] < 2.0
    assert "cand-03" not in by_candidate


def test_match_moving_objects_respects_the_tolerance():
    candidates = [{"id": "cand-01", "ra": 266.41, "dec": -29.08}]
    # ~24 arcsec away: inside a 60 arcsec tolerance, outside a 5 arcsec one.
    assert len(match_moving_objects(candidates, OBJECTS, tolerance_arcsec=60.0)) == 1
    assert len(match_moving_objects(candidates, OBJECTS, tolerance_arcsec=5.0)) == 0


def test_match_moving_objects_handles_empty_inputs():
    assert match_moving_objects([], OBJECTS) == []
    assert match_moving_objects([{"id": "x", "ra": 1.0, "dec": 1.0}], []) == []
    # A candidate without a position is skipped rather than crashing.
    assert match_moving_objects([{"id": "x", "ra": None, "dec": None}], OBJECTS) == []
