"""Scientific image registration, reprojection, and difference computation."""

import numpy as np
from astropy.wcs.wcs import NoConvergence
from astropy.stats import sigma_clipped_stats
from scipy.ndimage import map_coordinates
from .fits import ImagePlane

def safe_world_to_pixel(wcs, ra, dec):
    try:
        return wcs.world_to_pixel_values(ra, dec)
    except NoConvergence as e:
        x, y = e.best_solution[..., 0], e.best_solution[..., 1]
        if hasattr(e, "divergent") and e.divergent is not None:
            x[e.divergent] = np.nan
            y[e.divergent] = np.nan
        return x, y

def reproject_to(source: ImagePlane, target: ImagePlane):
    yy, xx = np.indices(target.image.shape)
    ra, dec = target.wcs.pixel_to_world_values(xx, yy)
    
    valid_sky = np.isfinite(ra) & np.isfinite(dec) & (dec >= -90.0) & (dec <= 90.0)
    ra[~valid_sky] = np.nan
    dec[~valid_sky] = np.nan
    
    sx, sy = safe_world_to_pixel(source.wcs, ra, dec)
    valid_px = (
        valid_sky
        & np.isfinite(sx)
        & np.isfinite(sy)
        & (sx >= -0.5)
        & (sx <= source.image.shape[1] - 0.5)
        & (sy >= -0.5)
        & (sy <= source.image.shape[0] - 0.5)
    )
    
    mask_in = source.mask.astype(float)
    mask_out = map_coordinates(
        mask_in,
        [np.clip(sy, 0, source.image.shape[0] - 1), np.clip(sx, 0, source.image.shape[1] - 1)],
        order=0,
        cval=1.0,
    ) > 0.5
    mask_out[~valid_px] = True
    
    data_in = np.where(source.mask, np.nan, source.image)
    image_out = map_coordinates(
        data_in,
        [np.clip(sy, 0, source.image.shape[0] - 1), np.clip(sx, 0, source.image.shape[1] - 1)],
        order=1,
        cval=np.nan,
    )
    
    mask_out |= ~np.isfinite(image_out)
    image_out[mask_out] = np.nan
    
    var_out = None
    if source.variance is not None:
        var_out = map_coordinates(
            source.variance,
            [np.clip(sy, 0, source.image.shape[0] - 1), np.clip(sx, 0, source.image.shape[1] - 1)],
            order=1,
            cval=np.nan,
        )
        bad_var = ~np.isfinite(var_out) | (var_out <= 0)
        mask_out |= bad_var
        
    return image_out, var_out, mask_out

def robust_background(image: np.ndarray, mask: np.ndarray | None = None) -> tuple[float, float]:
    median, std = sigma_clipped_stats(image, mask=mask, sigma=3.0, maxiters=5)[1:]
    if not np.isfinite(median) or not np.isfinite(std):
        raise ValueError("Insufficient finite pixels for robust background")
    return float(median), max(float(std), 1e-12)

def compute_difference(a: ImagePlane, b: ImagePlane) -> dict:
    # Check photometric units
    unit_a = a.header.get("BUNIT", "MJy/sr")
    unit_b = b.header.get("BUNIT", "MJy/sr")
    if unit_a != unit_b:
        raise ValueError(f"Incompatible photometric units: {unit_a} vs {unit_b}")

    aligned_b, var_b, mask_b = reproject_to(b, a)
    mask = a.mask | mask_b | ~np.isfinite(a.image) | ~np.isfinite(aligned_b)

    if np.count_nonzero(~mask) < 20:
        raise ValueError("Insufficient overlapping valid pixels to compute difference")

    bg_a, noise_a = robust_background(a.image, mask)
    bg_b, noise_b = robust_background(aligned_b, mask)

    # Additive background subtraction preserves true point-source flux deltas
    delta = (aligned_b - bg_b) - (a.image - bg_a)

    variance = (
        (a.variance if a.variance is not None else np.full(a.image.shape, noise_a**2))
        + (var_b if var_b is not None else np.full(a.image.shape, noise_b**2))
    )
    significance = delta / np.sqrt(np.maximum(variance, 1e-20))

    delta[mask] = np.nan
    significance[mask] = np.nan

    return {
        "difference": delta,
        "significance": significance,
        "aligned_b": aligned_b,
        "variance_b": var_b,
        "mask": mask,
        "metadata": {
            "background_a": bg_a,
            "background_b": bg_b,
            "noise_a": noise_a,
            "noise_b": noise_b,
            "valid_fraction": float(np.mean(~mask)),
            "unit": unit_a,
            "normalization": "Additive background matched; unit gain delta",
        },
    }
