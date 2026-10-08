"""SPHEREx FITS parsing, validation, and metadata extraction."""

from dataclasses import dataclass
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from scipy.interpolate import RegularGridInterpolator
from .config import MAX_PIXELS

@dataclass
class ImagePlane:
    image: np.ndarray
    variance: np.ndarray | None
    flags: np.ndarray
    wcs: WCS
    header: fits.Header
    primary: fits.Header
    wave: tuple | None
    zodi: np.ndarray | None

    @property
    def mask(self) -> np.ndarray:
        # SOURCE (bit 21) is nominal in SPHEREx, not a bad-pixel flag
        valid = np.isfinite(self.image) & (
            (self.flags & np.uint32(0xFFFFFFFF ^ (1 << 21))) == 0
        )
        if self.variance is not None:
            valid &= np.isfinite(self.variance) & (self.variance > 0)
        return ~valid

    def wavelength(self, x: float, y: float) -> float | None:
        if self.wave is None:
            return None
        xs, ys, values = self.wave
        try:
            val = RegularGridInterpolator(
                (ys, xs), values, bounds_error=False, fill_value=np.nan
            )((y + 1, x + 1))
            return float(val) if np.isfinite(val) else None
        except Exception:
            return None

def read_fits(path) -> ImagePlane:
    with fits.open(path, memmap=False) as hdus:
        hdus.verify("exception")
        hdu = hdus["IMAGE"] if "IMAGE" in hdus else hdus[0]
        if hdu.data is None or hdu.data.ndim != 2 or hdu.data.size > MAX_PIXELS:
            raise ValueError("Expected a bounded two-dimensional image")
        
        image = np.array(hdu.data, dtype=float)
        variance = (
            np.array(hdus["VARIANCE"].data, dtype=float) if "VARIANCE" in hdus else None
        )
        flags = (
            np.array(hdus["FLAGS"].data, dtype=np.uint32)
            if "FLAGS" in hdus
            else np.zeros(image.shape, dtype=np.uint32)
        )
        
        if flags.shape != image.shape or (
            variance is not None and variance.shape != image.shape
        ):
            raise ValueError("Inconsistent image, variance or flags dimensions")
            
        wcs = WCS(hdu.header, hdus, naxis=2).celestial
        if not wcs.has_celestial:
            raise ValueError("Missing celestial WCS")
            
        wave = None
        if "WCS-WAVE" in hdus:
            row = hdus["WCS-WAVE"].data[0]
            xs = np.ravel(row["X"]).astype(float)
            ys = np.ravel(row["Y"]).astype(float)
            xs = (xs - hdu.header.get("CRVAL1W", 1)) / hdu.header.get(
                "CDELT1W", 1
            ) + hdu.header.get("CRPIX1W", 1)
            ys = (ys - hdu.header.get("CRVAL2W", 1)) / hdu.header.get(
                "CDELT2W", 1
            ) + hdu.header.get("CRPIX2W", 1)
            values = np.asarray(row["VALUES"])
            if values.shape[-1] == 2:
                values = values[..., 0]
            elif values.shape[0] == 2:
                values = values[0]
            values = values.reshape(len(ys), len(xs))
            wave = (xs, ys, values)
        elif "CWAVE" in hdus:
            values = np.asarray(hdus["CWAVE"].data)
            wave = (
                np.arange(image.shape[1]) + 1,
                np.arange(image.shape[0]) + 1,
                values,
            )
            
        return ImagePlane(
            image=image,
            variance=variance,
            flags=flags,
            wcs=wcs,
            header=hdu.header.copy(),
            primary=hdus[0].header.copy(),
            wave=wave,
            zodi=np.array(hdus["ZODI"].data, dtype=float) if "ZODI" in hdus else None,
        )

def get_plane_metadata(plane: ImagePlane) -> dict:
    h, w = plane.image.shape
    ra, dec = plane.wcs.pixel_to_world_values((w - 1) / 2.0, (h - 1) / 2.0)
    return {
        "width": w,
        "height": h,
        "ra": float(ra),
        "dec": float(dec),
        "unit": plane.header.get("BUNIT", "MJy/sr"),
        "wavelength_um": plane.wavelength((w - 1) / 2.0, (h - 1) / 2.0),
        "valid_fraction": float(np.mean(~plane.mask)),
        "has_variance": plane.variance is not None,
        "date": plane.primary.get("DATE-OBS", plane.header.get("DATE-OBS")),
        "detector": plane.primary.get("DETECTOR", plane.header.get("DETECTOR", 1)),
        "band": plane.primary.get("BAND", plane.header.get("BAND", 1)),
    }

def inspect_pixel(plane: ImagePlane, x: int, y: int) -> dict:
    if not (0 <= x < plane.image.shape[1] and 0 <= y < plane.image.shape[0]):
        raise ValueError("Pixel coordinates outside image bounds")
    ra, dec = plane.wcs.pixel_to_world_values(x, y)
    val = float(plane.image[y, x]) if np.isfinite(plane.image[y, x]) else None
    var = float(plane.variance[y, x]) if plane.variance is not None and np.isfinite(plane.variance[y, x]) else None
    return {
        "x": x,
        "y": y,
        "ra": float(ra),
        "dec": float(dec),
        "intensity": val,
        "variance": var,
        "flag": int(plane.flags[y, x]),
        "wavelength_um": plane.wavelength(x, y),
        "unit": plane.header.get("BUNIT", "MJy/sr"),
    }
