"""SPHEREx Science Worker Configuration."""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_PATH = Path(os.getenv("STORAGE_PATH", BASE_DIR / "storage")).resolve()
DATA = STORAGE_PATH

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "spherex_atlas")

# Science / Archive Limits
MAX_PIXELS = int(os.getenv("MAX_PIXELS", str(4096 * 4096)))
MAX_DOWNLOAD = int(os.getenv("MAX_DOWNLOAD", str(50 * 1024 * 1024)))  # 50MB
MAX_CACHE = int(os.getenv("MAX_CACHE", str(2 * 1024 * 1024 * 1024)))  # 2GB
MAX_QUERY_RADIUS = float(os.getenv("MAX_QUERY_RADIUS", "0.25"))

# Worker Parameters
WORKER_HEARTBEAT_INTERVAL = int(os.getenv("WORKER_HEARTBEAT_INTERVAL", "15"))
JOB_TIMEOUT_SECONDS = int(os.getenv("JOB_TIMEOUT_SECONDS", "300"))
MAX_JOB_ATTEMPTS = int(os.getenv("MAX_JOB_ATTEMPTS", "3"))

def output_path(relative: str) -> Path:
    target = STORAGE_PATH / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    return target
