"""Astronomical image normalization and browser-ready preview generation."""

import numpy as np
from PIL import Image, ImageEnhance

def normalize(image: np.ndarray, mask: np.ndarray | None = None, stretch: str = "asinh", limits: tuple | None = None) -> np.ndarray:
    valid = np.isfinite(image) if mask is None else np.isfinite(image) & ~mask
    if not np.any(valid):
        return np.zeros_like(image, dtype=float)
    
    low, high = limits if limits is not None else np.percentile(image[valid], [0.5, 99.5])
    span = max(float(high - low), 1e-12)
    
    scaled = np.clip((np.nan_to_num(image, nan=low) - low) / span, 0.0, 1.0)
    
    if stretch == "asinh":
        scaled = np.arcsinh(scaled * 10.0) / np.arcsinh(10.0)
    elif stretch == "sqrt":
        scaled = np.sqrt(scaled)
    elif stretch == "log":
        scaled = np.log1p(scaled * 100.0) / np.log(101.0)
    elif stretch != "linear":
        raise ValueError(f"Unknown stretch method: {stretch}")
        
    scaled[~valid] = 0.0
    return scaled

def generate_preview(image: np.ndarray, path, mask: np.ndarray | None = None, signed: bool = False, limits: tuple | None = None) -> str:
    if signed:
        valid = np.isfinite(image) if mask is None else np.isfinite(image) & ~mask
        if not np.any(valid):
            raise ValueError("No valid pixels to render signed preview")
        scale = max(float(np.percentile(np.abs(image[valid]), 99.0)), 1e-12)
        v = np.nan_to_num(np.clip(image / scale, -1.0, 1.0))
        # Positive excess -> red, negative deficit -> blue
        rgb = np.stack([np.maximum(v, 0.0), np.abs(v) * 0.35, np.maximum(-v, 0.0)], axis=-1)
        rgb[~valid] = 0.0
        output = Image.fromarray((rgb * 255.0).astype(np.uint8))
    else:
        norm = normalize(image, mask=mask, limits=limits)
        output = Image.fromarray((norm * 255.0).astype(np.uint8))
        
    output.save(path, quality=88)
    return str(path)
