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
Fetches the full comparison record, including aligned image paths, delta statistics, RMS difference, detected change candidates, and the `movingObjects` array of NASA JPL identifications recorded for the comparison.

### `GET /api/comparisons/:id/moving-objects`
Returns the solar-system identifications the science worker stored for this comparison.
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "comparisonId": "comp-xyz-789",
      "count": 1,
      "matches": [
        {
          "id": "mom-...",
          "candidateId": "cand-comp-xyz-01",
          "objectName": "41739 (2000 UP112)",
          "designation": "41739",
          "ra": 44.98238,
          "dec": 16.64558,
          "separationArcsec": 12.4,
          "apparentMagnitude": 20.6,
          "motionArcsecPerHour": 19.5,
          "epochUtc": "2026-08-17T13:11:28.204Z",
          "source": "NASA/JPL Small-Body Identification",
          "orbit": { "orbit_class": "Main-belt Asteroid", "neo": false, "elements": { "a": { "value": 2.6645 } } }
        }
      ],
      "source": "NASA/JPL Small-Body Identification + Small-Body Database"
    }
  }
  ```

### `POST /api/comparisons/:id/identify`
Queues a fresh `IDENTIFY_OBJECTS` job for a completed comparison. Returns `202` when a new job is queued and `200` when one is already pending.
- **Request Body** (both optional):
  ```json
  { "vmagLimit": 22, "toleranceArcsec": 60 }
  ```
- **Errors**: `COMPARISON_NOT_FOUND` (404), `COMPARISON_NOT_READY` (409) when the difference image has not been computed yet.

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

## 7b. NASA Archive — NASA/IPAC IRSA (live)

These endpoints query IRSA directly and do not depend on the local database. No API key is required.

### `GET /api/archive/collections`
Lists the SPHEREx collections the IRSA SIA2 service publishes, with the configured default.

### `POST /api/archive/search`
Runs a live IVOA Simple Image Access v2 positional query against the SPHEREx archive.
- **Request Body**:
  ```json
  {
    "ra": 266.4,
    "dec": -29.0,
    "radiusDeg": 0.05,
    "collection": "spherex_qr3",
    "band": 5,
    "limit": 50
  }
  ```
  `radiusDeg` defaults to `0.25` (max `1.0`), `band` is a detector number 1–6, `limit` defaults to `50`.
- **Response**: `{collection, ra, dec, radiusDeg, band, totalMatched, returned, products[], epochRange, bands[], source}`. Each product carries `archiveId`, `detector`, `observationDate` (UTC), `wavelengthMinUm`/`wavelengthMaxUm`, `accessUrl`, `pixelScaleArcsec` and the rest of the normalised ObsCore record.
- **Errors**: `IRSA_UNKNOWN_COLLECTION`, `IRSA_INVALID_QUERY` (400); `UPSTREAM_UNREACHABLE` (504).

### `POST /api/archive/cutout-url`
Builds an IRSA Image Bounded Extraction (IBE) cutout URL for a product.
- **Request Body**: `{ "accessUrl": "https://irsa.ipac.caltech.edu/ibe/data/spherex/…", "ra": 266.4, "dec": -29.0, "sizeDeg": 0.12 }`
- Only `irsa.ipac.caltech.edu` URLs are accepted; `sizeDeg` is capped at `0.5`.

---

## 7c. Solar System — NASA JPL (live)

Backed by JPL's Solar System Dynamics APIs. Only the NeoWs endpoint needs `NASA_API_KEY`.

### `POST /api/solar-system/identify`
Lists every known minor planet or comet inside a field of view at an instant, using JPL's Small-Body Identification service.
- **Request Body**:
  ```json
  {
    "ra": 266.4,
    "dec": -29.0,
    "halfWidthDeg": 0.15,
    "obsTime": "2026-01-01T00:00:00Z",
    "vmagLimit": 22,
    "twoPass": true
  }
  ```
  `halfWidthDeg` is capped at `2.5`. `twoPass` (default `true`) asks JPL to refine each hit with a numerically integrated orbit, which is what makes the positions trustworthy at the arcsecond level — and what makes the call take 30–60 s.
- **Response**: `{ra, dec, halfWidthDeg, epochUtc, vmagLimit, observer, pass, count, objects[], source}`, each object with `name`, `designation`, `ra`, `dec`, `offsetArcsec`, `apparentMagnitude` and `motionArcsecPerHour`.

### `GET /api/solar-system/ephemeris`
Observer-centred Horizons ephemeris.
- **Query**: `target` (required), then either `epoch`, or `start` + `stop` + optional `step` (default `1 d`). `center` defaults to `500@399` (geocentric).
- **Example**: `/api/solar-system/ephemeris?target=433&epoch=2026-01-01T00:00:00Z`
- **Response**: `{target, center, rows[], source}` with `timeUtc`, `raDeg`, `decDeg`, rates, `apparentMagnitude`, `heliocentricDistanceAu`, `observerDistanceAu`, `solarElongationDeg` and `phaseAngleDeg`.

### `GET /api/solar-system/objects/:designation`
JPL Small-Body Database record: orbital elements with uncertainties, orbit class, orbit quality and physical parameters.

### `GET /api/solar-system/neo/:identifier`
api.nasa.gov NeoWs near-Earth-object data. Accepts a minor-planet number (`433`), a NeoWs identifier (`2000433`) or the SBDB SPK identifier (`20000433`) — the two JPL services number the same body differently and the API reconciles them.
- **Errors**: `NASA_API_KEY_MISSING` (503) when no key is configured.

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
