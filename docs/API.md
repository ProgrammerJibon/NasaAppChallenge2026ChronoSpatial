# Chrono & Spatial — SPHEREx API Reference

The backend API server runs on port 4000 (configurable via `PORT` in `server/.env`). All responses adhere to a standard JSON envelope:

```json
{
  "ok": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": null
  }
}
```

---

## 1. System & Health

### `GET /api/health`
Returns the operational health of the server and database connection.
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "status": "healthy",
      "uptimeSeconds": 1420,
      "db": "connected"
    }
  }
  ```

### `GET /api/bootstrap`
Returns initial seed data required to render the application without cold-start blocking.
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "featuredRegion": { "id": "...", "slug": "m31", "name": "Andromeda Galaxy (M31)" },
      "demoObservations": [ ... ],
      "demoComparisonId": "91e2fa3a-...",
      "serverStatus": "healthy",
      "workerStatus": "active",
      "dataSource": {
        "label": "NASA/IPAC Infrared Science Archive (IRSA)",
        "archive": "IRSA",
        "collection": "spherex_qr3",
        "level": "Level-2 calibrated single-exposure spectral images (FITS)"
      }
    }
  }
  ```

---

## 2. Sky Regions

### `GET /api/regions`
Lists all registered celestial regions.
- **Response**: Array of `SkyRegion` objects.

### `GET /api/regions/:slug`
Fetches a specific region and its associated observations.
- **Parameters**: `slug` (e.g. `m31`, `orion-nebula`, `pleiades`).

---

## 3. Observations

### `GET /api/observations`
Lists observation records with optional filtering.
- **Query Parameters**:
  - `regionId` (string, optional)
  - `band` (integer 1–6, optional)
  - `limit` (default 50, max 200)
  - `offset` (default 0)

### `GET /api/observations/:id`
Retrieves a single observation by ID, including its full WCS and detector metadata.

### `POST /api/observations/search`
Searches observations by celestial coordinates (RA/Dec) and cone radius.
- **Request Body**:
  ```json
  {
    "ra": 10.684,
    "dec": 41.269,
    "radiusDeg": 0.5,
    "band": 2
  }
  ```
- **Response**:
  Returns cached observations or enqueues an asynchronous IRSA search job:
  ```json
  {
    "ok": true,
    "data": {
      "status": "cached",
      "observations": [ ... ]
    }
  }
  ```

---

## 4. Comparisons & Science

### `POST /api/comparisons`
Initiates a scientific temporal comparison between two observation epochs.
- **Request Body**:
  ```json
  {
    "observationAId": "obs-001",
    "observationBId": "obs-002"
  }
  ```
- **Response**:
  Returns existing completed comparison or enqueues a science processing job:
  ```json
  {
    "ok": true,
    "data": {
      "status": "queued",
      "jobId": "job-abc-123",
      "comparisonId": "comp-xyz-789"
    }
  }
  ```

### `GET /api/comparisons/:id`
Fetches the full comparison record, including aligned image paths, delta statistics, RMS difference, and detected change candidates.

---

## 5. Citizen Review

### `GET /api/review/next`
Returns the next candidate requiring human classification. Prioritizes candidates with low review counts.
- **Headers**: `x-visitor-id` (optional, prevents serving candidates already reviewed by the client).

### `POST /api/reviews`
Submits a peer review for a change candidate.
- **Request Body**:
  ```json
  {
    "comparisonId": "comp-xyz-789",
    "candidateId": "cand-001",
    "visitorHash": "hash-client-123",
    "classification": "transient",
    "confidence": 0.95
  }
  ```

### `GET /api/reviews/stats/:comparisonId`
Returns aggregate community consensus metrics for a comparison.

---

## 6. Jobs & Progress

### `GET /api/jobs/:id`
Polls the execution state of an asynchronous processing job.
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "id": "job-abc-123",
      "type": "compare_observations",
      "status": "processing",
      "progress": 65,
      "attempts": 1,
      "error": null
    }
  }
  ```

---

## 7. File Streaming

### `GET /api/files/preview/:observationId`
Streams the WebP preview image for an observation with HTTP caching headers.

### `GET /api/files/comparison/:comparisonId/:kind`
Streams scientific comparison image assets.
- **URL Parameter `kind`**:
  - `aligned-a`: Observation A reprojected onto baseline WCS.
  - `aligned-b`: Observation B reprojected onto baseline WCS.
  - `difference`: Calibrated surface brightness difference map (MJy/sr).
  - `significance`: Statistical significance map ($\sigma$).

---

## 8. Administration (Protected)

Requires `Authorization: Bearer <token>` header.

### `POST /api/admin/login`
- **Request Body**: `{ "password": "<ADMIN_PASSWORD>" }`
- **Response**: `{ "token": "...", "expiresAt": "..." }`

### `POST /api/admin/logout`
Terminates the administrative session.

### `GET /api/admin/status`
Returns database row counts, system uptime, and science worker heartbeat.

### `GET /api/admin/jobs`
Lists all processing jobs with pagination and status filters.

### `POST /api/admin/jobs/:id/retry`
Re-queues a failed or cancelled processing job.

### `POST /api/admin/jobs/:id/cancel`
Cancels a queued or processing job.

### `GET /api/admin/storage`
Returns disk volume breakdown across storage directories.

### `POST /api/admin/cache/cleanup`
Safely purges temporary processing files in `storage/cache/`.
