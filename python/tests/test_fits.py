import numpy as np
import pytest
from pathlib import Path
from astropy.io import fits
from astropy.wcs import WCS
from spherex.fits import read_fits, get_plane_metadata, inspect_pixel, ImagePlane

def make_test_plane(shape=(40, 40)):
    image = np.ones(shape, dtype=float) * 15.0
    image[20, 20] = 150.0  # Point source
    variance = np.ones(shape, dtype=float) * 2.0
    flags = np.zeros(shape, dtype=np.uint32)
    
    w = WCS(naxis=2)
    w.wcs.crpix = [20.0, 20.0]
    w.wcs.cdelt = [-0.0017, 0.0017]
    w.wcs.crval = [10.0, 40.0]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    
    hdr = w.to_header()
    hdr["BUNIT"] = "MJy/sr"
    hdr["DATE-OBS"] = "2025-08-01T00:00:00"
    
    primary = fits.Header()
    primary["DATE-OBS"] = "2025-08-01T00:00:00"
    primary["DETECTOR"] = 2
    primary["BAND"] = 2
    
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

def test_plane_mask_and_properties():
    plane = make_test_plane()
    assert plane.image.shape == (40, 40)
    assert not np.any(plane.mask)
    
    # Flag a bad pixel
    plane.flags[5, 5] = 1
    assert plane.mask[5, 5]

def test_metadata_extraction():
    plane = make_test_plane()
    meta = get_plane_metadata(plane)
    assert meta["width"] == 40
    assert meta["height"] == 40
    assert meta["unit"] == "MJy/sr"
    assert meta["detector"] == 2
    assert meta["valid_fraction"] == 1.0

def test_pixel_inspection():
    plane = make_test_plane()
    res = inspect_pixel(plane, 20, 20)
    assert res["x"] == 20
    assert res["y"] == 20
    assert res["intensity"] == 150.0
    assert res["unit"] == "MJy/sr"
    
    with pytest.raises(ValueError):
        inspect_pixel(plane, 999, 999)

def test_real_fits_file_if_available():
    fits_files = list(Path("storage/fits").glob("*.fits"))
    if not fits_files:
        pytest.skip("No local FITS files in storage/fits")
    sample = fits_files[0]
    plane = read_fits(sample)
    assert plane.image.ndim == 2
    assert plane.wcs.has_celestial
    meta = get_plane_metadata(plane)
    assert meta["width"] > 0
