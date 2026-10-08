"""Conservative candidate extraction: motion, brightness variations, and transients."""

import math
import numpy as np
from astropy.coordinates import SkyCoord
from astropy import units as u
from scipy.optimize import linear_sum_assignment
from photutils.detection import DAOStarFinder
from photutils.aperture import CircularAperture, aperture_photometry
from .comparison import robust_background

def detect_sources(image: np.ndarray, wcs, variance: np.ndarray | None = None, mask: np.ndarray | None = None, threshold: float = 5.0) -> list[dict]:
    mask = (~np.isfinite(image)) if mask is None else mask | ~np.isfinite(image)
    if np.count_nonzero(~mask) < 20:
        return []
    
    background, noise = robust_background(image, mask)
    finder = DAOStarFinder(threshold=threshold * noise, fwhm=2.5, exclude_border=True)
    clean_image = np.where(mask, 0.0, image - background)
    
    found = finder(clean_image, mask=mask)
    if found is None or len(found) == 0:
        return []

    results = []
    h, w = image.shape
    for row in found[:100]:
        x, y = float(row["xcentroid"]), float(row["ycentroid"])
        if not (2 <= x < w - 2 and 2 <= y < h - 2):
            continue
            
        aperture = CircularAperture([(x, y)], r=2.5)
        flux = float(
            aperture_photometry(clean_image, aperture, mask=mask)["aperture_sum"][0]
        )
        
        var_data = variance if variance is not None else np.full(image.shape, noise**2)
        err = math.sqrt(
            max(
                0.0,
                float(aperture_photometry(var_data, aperture, mask=mask)["aperture_sum"][0])
            )
        )
        
        ra, dec = wcs.pixel_to_world_values(x, y)
        results.append({
            "x": x,
            "y": y,
            "ra": float(ra),
            "dec": float(dec),
            "flux": flux,
            "flux_error": max(err, 1e-12),
            "snr": flux / max(err, 1e-12),
            "sharpness": float(row.get("sharpness", 0.5)),
        })
    return results

def match_sources(sources_a: list[dict], sources_b: list[dict], max_arcsec: float = 60.0) -> list[tuple[int, int, float]]:
    if not sources_a or not sources_b:
        return []
    ca = SkyCoord([s["ra"] for s in sources_a] * u.deg, [s["dec"] for s in sources_a] * u.deg)
    cb = SkyCoord([s["ra"] for s in sources_b] * u.deg, [s["dec"] for s in sources_b] * u.deg)
    
    cost = ca[:, None].separation(cb[None, :]).arcsec
    padded = np.full((len(sources_a), len(sources_b) + len(sources_a)), max_arcsec)
    padded[:, : len(sources_b)] = np.minimum(cost, max_arcsec * 10.0)
    
    rows, cols = linear_sum_assignment(padded)
    return [
        (int(i), int(j), float(cost[i, j]))
        for i, j in zip(rows, cols)
        if j < len(sources_b) and cost[i, j] < max_arcsec
    ]

def calculate_motion(ra_a: float, dec_a: float, ra_b: float, dec_b: float, interval_days: float) -> dict:
    if interval_days <= 0:
        raise ValueError("Epoch B must have an observation date after Epoch A")
    a = SkyCoord(ra_a * u.deg, dec_a * u.deg)
    b = SkyCoord(ra_b * u.deg, dec_b * u.deg)
    dra, ddec = a.spherical_offsets_to(b)
    displacement = float(a.separation(b).arcsec)
    return {
        "displacement_arcsec": displacement,
        "delta_ra_arcsec": float(dra.arcsec),
        "delta_dec_arcsec": float(ddec.arcsec),
        "position_angle_deg": float(a.position_angle(b).deg),
        "interval_days": interval_days,
        "angular_speed_arcsec_per_day": displacement / interval_days,
    }

def extract_candidates(sources_a: list[dict], sources_b: list[dict], interval_days: float = 180.0) -> list[dict]:
    candidates = []
    matches = match_sources(sources_a, sources_b, max_arcsec=45.0)
    matched_a = {i for i, _, _ in matches}
    matched_b = {j for _, j, _ in matches}

    # 1. Matched pairs: look for significant motion or brightness changes
    for i, j, sep_arcsec in matches:
        sa, sb = sources_a[i], sources_b[j]
        flux_diff = sb["flux"] - sa["flux"]
        combined_err = math.sqrt(sa["flux_error"]**2 + sb["flux_error"]**2)
        flux_sigma = abs(flux_diff) / max(combined_err, 1e-12)

        if sep_arcsec > 3.0:
            # Significant apparent motion
            score = min(99.0, max(50.0, 60.0 + sep_arcsec * 3.0))
            candidates.append({
                "x": sb["x"],
                "y": sb["y"],
                "ra": sb["ra"],
                "dec": sb["dec"],
                "change_type": "moving_object",
                "motion_arcsec": round(sep_arcsec, 2),
                "brightness_change": round(flux_diff, 2),
                "score": round(score, 1),
                "metadata_json": {
                    "source_a_flux": sa["flux"],
                    "source_b_flux": sb["flux"],
                    "separation_arcsec": sep_arcsec,
                    "possible_class": "Moving object candidate (Proper Motion / Asteroid)",
                },
            })
        elif flux_sigma > 3.5:
            # Significant brightness change
            score = min(98.0, max(50.0, 50.0 + flux_sigma * 5.0))
            candidates.append({
                "x": sb["x"],
                "y": sb["y"],
                "ra": sb["ra"],
                "dec": sb["dec"],
                "change_type": "brightness_change",
                "motion_arcsec": round(sep_arcsec, 2),
                "brightness_change": round(flux_diff, 2),
                "score": round(score, 1),
                "metadata_json": {
                    "flux_sigma": round(flux_sigma, 2),
                    "source_a_flux": sa["flux"],
                    "source_b_flux": sb["flux"],
                    "possible_class": "Variable star / transient flux variation",
                },
            })

    # 2. Unmatched in Epoch A (appeared in B)
    for j, sb in enumerate(sources_b):
        if j not in matched_b and sb["snr"] > 6.0:
            candidates.append({
                "x": sb["x"],
                "y": sb["y"],
                "ra": sb["ra"],
                "dec": sb["dec"],
                "change_type": "appeared",
                "motion_arcsec": 0.0,
                "brightness_change": round(sb["flux"], 2),
                "score": round(min(95.0, 70.0 + sb["snr"]), 1),
                "metadata_json": {
                    "epoch_b_snr": round(sb["snr"], 2),
                    "possible_class": "Newly detected source / flare candidate",
                },
            })

    return candidates
