"""IRSA SIA2 discovery and bounded, content-addressed FITS cutout retrieval."""

import hashlib
import io
import logging
import os
import time
import uuid
from urllib.parse import urlparse, urlencode
import numpy as np
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from astropy.io import fits
from astropy.io.votable import parse
from .config import DATA, MAX_DOWNLOAD, MAX_CACHE, MAX_PIXELS, output_path

BASE = os.getenv("IRSA_BASE_URL", "https://irsa.ipac.caltech.edu").rstrip("/")
COLLECTIONS = {"spherex_qr3", "spherex_qr3_deep", "spherex_qr2", "spherex_qr2_deep"}

SESSION = requests.Session()
SESSION.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=2,
            backoff_factor=1,
            status_forcelist=[429, 502, 503, 504],
            allowed_methods=["GET"],
        )
    ),
)

def checked_url(url: str) -> str:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "irsa.ipac.caltech.edu"
        or parsed.username
        or parsed.port not in (None, 443)
    ):
        raise ValueError("Only HTTPS NASA/IPAC IRSA URLs are allowed")
    return url

def query(ra: float, dec: float, radius: float, collection: str | None = None, limit: int = 150) -> list[dict]:
    if not (0 <= ra < 360 and -90 <= dec <= 90 and 0 < radius <= 1.0):
        raise ValueError("Invalid coordinates or query radius")
        
    collection = collection or os.getenv("IRSA_COLLECTION", "spherex_qr3")
    if collection not in COLLECTIONS:
        raise ValueError("Unknown SPHEREx collection")
        
    params = {"COLLECTION": collection, "POS": f"CIRCLE {ra} {dec} {radius}"}
    url = checked_url(BASE + "/SIA")
    cache_key = hashlib.sha256((url + urlencode(params)).encode()).hexdigest()
    cache = output_path(f"cache/query-{cache_key}.xml")
    
    if cache.exists() and time.time() - cache.stat().st_mtime < 86400:
        content = cache.read_bytes()
    else:
        response = SESSION.get(
            url, params=params, timeout=(10, 60), stream=True, allow_redirects=False
        )
        response.raise_for_status()
        content = bytearray()
        for chunk in response.iter_content(65536):
            content.extend(chunk)
            if len(content) > 16 * 1024 * 1024:
                raise ValueError("Archive query response exceeds limit; reduce radius")
        cache.write_bytes(content)
        
    votable = parse(io.BytesIO(content))
    for resource in votable.resources:
        for info in resource.infos:
            if info.name == "QUERY_STATUS" and info.value == "ERROR":
                raise ValueError("IRSA rejected the archive query")
                
    tables = list(votable.iter_tables())
    if not tables:
        return []
        
    table = tables[-1].to_table(use_names_over_ids=True)

    def clean(value):
        if np.ma.is_masked(value):
            return None
        if isinstance(value, bytes):
            return value.decode(errors="replace")
        if isinstance(value, np.ndarray):
            return value.tolist()
        if isinstance(value, np.generic):
            return value.item()
        if isinstance(value, float) and not np.isfinite(value):
            return None
        return value

    rows = [{name: clean(row[name]) for name in table.colnames} for row in table]
    rows.sort(key=lambda r: r.get("t_min") or 0)
    if len(rows) > limit:
        rows = [rows[i] for i in np.linspace(0, len(rows) - 1, limit, dtype=int)]

    return [
        {
            **row,
            "archive_collection": collection,
            "query_ra": ra,
            "query_dec": dec,
            "query_radius": radius,
        }
        for row in rows
    ]
