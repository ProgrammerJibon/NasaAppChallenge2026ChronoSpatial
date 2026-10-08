"""Storage management and path resolution."""

import os
from pathlib import Path
from . import config

def get_storage_path(relative_path: str) -> Path:
    sanitized = Path(relative_path).as_posix().lstrip("/\\")
    full_path = config.STORAGE_PATH / sanitized
    full_path.parent.mkdir(parents=True, exist_ok=True)
    return full_path

def resolve_file(relative_path: str) -> Path | None:
    if not relative_path:
        return None
    full_path = config.STORAGE_PATH / Path(relative_path).as_posix().lstrip("/\\")
    if full_path.exists():
        return full_path
    demo_path = config.STORAGE_PATH / "demo" / Path(relative_path).name
    if demo_path.exists():
        return demo_path
    return None
