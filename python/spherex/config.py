"""SPHEREx Science Worker Configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Configuration comes from the same files the API server uses, so the worker and
# the API never disagree about the database or the NASA settings. Real
# environment variables always win; server/.env supplies the database and
# integration settings, and the repository-root .env supplies the shared
# api.nasa.gov credential. Neither file is written to.
load_dotenv(BASE_DIR / "server" / ".env", override=False)
load_dotenv(BASE_DIR / ".env", override=False)

STORAGE_PATH = Path(os.getenv("STORAGE_PATH", BASE_DIR / "storage"))
if not STORAGE_PATH.is_absolute():
    # server/.env expresses STORAGE_PATH relative to the server directory.
    STORAGE_PATH = (BASE_DIR / "server" / STORAGE_PATH).resolve()
else:
    STORAGE_PATH = STORAGE_PATH.resolve()
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

# NASA api.nasa.gov credential. Shared with the API server; it is read here so
# the worker can reach api.nasa.gov services, and never logged or written out.
NASA_API_KEY = os.getenv("NASA_API_KEY", "").strip()
HAS_NASA_API_KEY = bool(NASA_API_KEY)

# Worker Parameters
WORKER_HEARTBEAT_INTERVAL = int(os.getenv("WORKER_HEARTBEAT_INTERVAL", "15"))
JOB_TIMEOUT_SECONDS = int(os.getenv("JOB_TIMEOUT_SECONDS", "300"))
MAX_JOB_ATTEMPTS = int(os.getenv("MAX_JOB_ATTEMPTS", "3"))


def output_path(relative: str) -> Path:
    target = STORAGE_PATH / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    return target
