import numpy as np
import pytest
from astropy.io import fits
from astropy.wcs import WCS
from spherex.fits import ImagePlane
from spherex.comparison import compute_difference, reproject_to, robust_background

def make_test_plane(shift_x=0.0, amplitude=50.0):
    y, x = np.indices((48, 48))
    rng = np.random.default_rng(42)
    # Background noise + Gaussian point source
    image = rng.normal(10.0, 0.5, (48, 48)) + amplitude * np.exp(
        -((x - 24.0 - shift_x) ** 2 + (y - 24.0) ** 2) / 4.0
    )
    variance = np.ones_like(image) * 0.25
    flags = np.zeros_like(image, dtype=np.uint32)

    w = WCS(naxis=2)
    w.wcs.crpix = [24.0, 24.0]
    w.wcs.cdelt = [-0.0017, 0.0017]
    w.wcs.crval = [10.0, 40.0]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]

    hdr = w.to_header()
    hdr["BUNIT"] = "MJy/sr"
    hdr["DATE-OBS"] = "2025-08-01T00:00:00"

    primary = fits.Header()
    primary["DATE-OBS"] = "2025-08-01T00:00:00"
    primary["DETECTOR"] = 2

    return ImagePlane(
        image=image,
        variance=variance,
        flags=flags,
        wcs=w,
        header=hdr,
        primary=primary,
        wave=None,
        zodi=None,
    )

def test_identical_plane_difference_is_near_zero():
    p1 = make_test_plane()
    p2 = make_test_plane()
    diff = compute_difference(p1, p2)
    valid_diff = diff["difference"][~diff["mask"]]
    assert np.nanmax(np.abs(valid_diff)) < 1e-4

def test_brightness_change_detection():
    p1 = make_test_plane(amplitude=50.0)
    p2 = make_test_plane(amplitude=100.0)
    diff = compute_difference(p1, p2)
    # The center difference should be approximately +50
    center_diff = diff["difference"][24, 24]
    assert center_diff == pytest.approx(50.0, abs=1.5)

def test_incompatible_units_raises_error():
    p1 = make_test_plane()
    p2 = make_test_plane()
    p2.header["BUNIT"] = "electron/s"
    with pytest.raises(ValueError, match="Incompatible photometric units"):
        compute_difference(p1, p2)

def test_robust_background():
    img = np.ones((30, 30)) * 25.0
    bg, std = robust_background(img)
    assert bg == pytest.approx(25.0)
    assert std >= 1e-12
