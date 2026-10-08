import numpy as np
import pytest
from astropy.wcs import WCS
from spherex.detection import (
    detect_sources,
    match_sources,
    calculate_motion,
    extract_candidates,
)

def make_wcs():
    w = WCS(naxis=2)
    w.wcs.crpix = [32.0, 32.0]
    w.wcs.cdelt = [-0.001, 0.001]
    w.wcs.crval = [10.0, 20.0]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    return w

def test_detect_sources_on_point_source():
    y, x = np.indices((64, 64))
    # Gaussian source at (32, 32)
    image = 10.0 + 80.0 * np.exp(-((x - 32.0)**2 + (y - 32.0)**2) / 3.0)
    wcs = make_wcs()
    sources = detect_sources(image, wcs, threshold=4.0)
    assert len(sources) >= 1
    best = sources[0]
    assert best["x"] == pytest.approx(32.0, abs=1.0)
    assert best["y"] == pytest.approx(32.0, abs=1.0)
    assert best["snr"] > 10.0

def test_match_sources():
    sa = [{"ra": 10.0, "dec": 20.0, "flux": 100.0, "flux_error": 5.0, "x": 10, "y": 10}]
    sb = [{"ra": 10.001, "dec": 20.001, "flux": 102.0, "flux_error": 5.0, "x": 11, "y": 11}]
    matches = match_sources(sa, sb, max_arcsec=30.0)
    assert len(matches) == 1
    assert matches[0][0] == 0
    assert matches[0][1] == 0
    assert matches[0][2] < 10.0

def test_calculate_motion():
    res = calculate_motion(10.0, 20.0, 10.001, 20.0, 180.0)
    assert res["displacement_arcsec"] > 0
    assert res["interval_days"] == 180.0
    assert res["angular_speed_arcsec_per_day"] > 0

    with pytest.raises(ValueError):
        calculate_motion(10.0, 20.0, 10.001, 20.0, 0.0)

def test_extract_candidates_brightness_change():
    sa = [{"ra": 10.0, "dec": 20.0, "flux": 10.0, "flux_error": 1.0, "x": 10, "y": 10, "snr": 10.0}]
    sb = [{"ra": 10.0, "dec": 20.0, "flux": 50.0, "flux_error": 1.0, "x": 10, "y": 10, "snr": 50.0}]
    candidates = extract_candidates(sa, sb, interval_days=180.0)
    assert len(candidates) == 1
    assert candidates[0]["change_type"] == "brightness_change"
    assert candidates[0]["brightness_change"] == pytest.approx(40.0)
    assert candidates[0]["score"] > 70.0
