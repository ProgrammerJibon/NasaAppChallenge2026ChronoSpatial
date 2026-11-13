# Chrono & Spatial — SPHEREx Sky Change Explorer

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org)
[![SPHEREx Mission](https://img.shields.io/badge/Mission-SPHEREx-purple.svg)](https://spherex.caltech.edu)
[![Frontend](https://img.shields.io/badge/Next.js-16%20Turbopack-black.svg)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Express-TypeScript%20%7C%20mysql2-green.svg)](https://expressjs.com)
[![Science Engine](https://img.shields.io/badge/Astropy-SciPy%20%7C%20photutils-orange.svg)](https://www.astropy.org)
[![Data](https://img.shields.io/badge/Data-NASA%2FIPAC%20IRSA%20%2B%20NASA%20JPL-red.svg)](https://irsa.ipac.caltech.edu)

> A dedicated web platform for exploring multi-epoch near-infrared observations from NASA's **SPHEREx** mission, visualizing celestial changes over time, and identifying the moving objects behind them using **NASA JPL** ephemerides.

---

## 1. Challenge & Mission Overview

NASA's **Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx)** is surveying the entire sky every six months in 102 near-infrared wavelength channels (0.75 µm to 5.0 µm).

Because SPHEREx repeats its all-sky survey on an approximate six-month cadence, comparing observations taken months apart reveals the dynamic universe:
- **Moving Solar System Bodies**: Asteroids, Centaurs, and Comets.
- **Variable Astrophysical Sources**: Pulsating variable stars, Mira variables, and protostellar flares.
- **Transients**: Novae, supernovae, and infrared echoes.
- **High Proper Motion Objects**: Nearby cool brown dwarfs and high-velocity stars.
- **Planetary Candidates & Kuiper Belt Objects**: Outer solar system bodies revealing parallax or orbital motion.

### Core Scientific Rule: Detector Bands vs 102 Spectral Channels

SPHEREx does **not** capture 102 individual full-sky image files. Instead, the instrument employs **six 2040×2040 detector arrays** (`D1`…`D6`), each fitted with a **Linear Variable Filter (LVF)**. In an LVF, the bandpass varies continuously across the physical detector. As the spacecraft scans the sky, successive exposures sample celestial targets at slightly different wavelengths, synthesizing 102 spectral resolution elements across the mission survey.

**Chrono & Spatial** preserves and respects this authentic Level-2 archive data structure. Each IRSA ObsCore row reports its detector through `energy_bandpassname` (e.g. `SPHEREx-D5`), which the platform stores as the observation's band number.

---

## 2. NASA Data Integrations

Every image, epoch, orbit and ephemeris the platform shows comes from a NASA service at request or job time. Nothing is synthesised, mocked, or stubbed.

| Service | Endpoint | Used for | API key |
|---|---|---|---|
| **NASA/IPAC IRSA — SIA2** | `https://irsa.ipac.caltech.edu/SIA` | Discovering SPHEREx Level-2 products at a sky position (IVOA Simple Image Access v2 over the ObsCore model) | Not required |
| **NASA/IPAC IRSA — IBE** | `https://irsa.ipac.caltech.edu/ibe/data/spherex/…` | Downloading bounded FITS **cutouts** of those products | Not required |
| **NASA JPL — Small-Body Identification** | `https://ssd-api.jpl.nasa.gov/sb_ident.api` | Listing every known minor planet or comet inside a field of view at a given instant | Not required |
| **NASA JPL — Horizons** | `https://ssd.jpl.nasa.gov/api/horizons.api` | Observer-centred ephemerides: predicted positions, apparent motion and magnitude at an exact epoch | Not required |
| **NASA JPL — Small-Body Database** | `https://ssd-api.jpl.nasa.gov/sbdb.api` | Orbital elements, orbit class, orbit quality and physical parameters for a matched body | Not required |
| **api.nasa.gov — NeoWs** | `https://api.nasa.gov/neo/rest/v1/neo/{id}` | JPL near-Earth-object data: close approaches, hazard classification, diameter | **`NASA_API_KEY`** |

The two **primary** sources — IRSA and the JPL Solar System Dynamics APIs — are open and need no credential, so the platform is fully functional without any key. `NASA_API_KEY` is used **only** for api.nasa.gov NeoWs and is never sent anywhere else, never logged, and never included in a cache key or an API response.

### How the two archives work together

```
   A sky position (RA, Dec)
            │
            ▼
   ┌──────────────────────┐   IRSA SIA2: which SPHEREx products cover this spot?
   │  irsa.search_products│──────────────────────────────────────────────►
   └──────────┬───────────┘   ◄── ObsCore rows: obs_id, detector, MJD, em_min/max, access_url
              │
              ▼
   ┌──────────────────────┐   IRSA IBE: give me a 0.12° cutout centred here
   │  irsa.download_cutout│──────────────────────────────────────────────►
   └──────────┬───────────┘   ◄── a real FITS file (IMAGE, VARIANCE, FLAGS, ZODI, WCS-WAVE)
              │
              ▼
   Two epochs of the same patch of sky → WCS reprojection → flux difference
              │
              ▼  change candidates with (RA, Dec) and an epoch
   ┌──────────────────────┐   JPL sb_ident: what known bodies were here at that instant?
   │ jpl.identify_moving_ │──────────────────────────────────────────────►
   │      objects         │   ◄── refined positions, V magnitude, sky motion
   └──────────┬───────────┘
              │ cross-match within a tolerance (default 60″)
              ▼
   ┌──────────────────────┐   JPL SBDB: what is this object's orbit?
   │   jpl.small_body     │──────────────────────────────────────────────►
   └──────────────────────┘   ◄── a, e, i, orbit class, NEO/PHA flags
```

A candidate **with** a JPL match is a catalogued solar-system body. A candidate **without** one is the interesting case: a variable source, an uncatalogued moving object, or an instrumental artefact.

### Scientific accuracy notes

- **Epochs** are converted from the ObsCore Modified Julian Date with `astropy.time` and stored as UTC. The whole stack is UTC end to end — the MySQL pool is pinned to `timezone: "Z"` so a DATETIME is never reinterpreted as host-local time.
- **Wavelengths** come from ObsCore `em_min`/`em_max` in metres and are stored in micrometres. The wavelength actually sampled at the centre of a cutout is read from the product's own `WCS-WAVE` LVF table.
- **Bad pixels** are rejected from the product's own `FLAGS` plane dictionary (`MSKN####`/`MSKM####` keywords). `SOURCE` is a nominal plane, not a defect — in a crowded field it is set on every pixel — so it never disqualifies one.
- **Identification accuracy** is cross-validated in the test suite: the position JPL's Small-Body Identification service reports for an object is compared against an independent Horizons ephemeris for the same instant and must agree to under 2″, far inside SPHEREx's 6.15″ pixel.
- **Observer location** for ephemerides defaults to MPC code `500` (geocentric). SPHEREx flies in low Earth orbit, so this approximates the spacecraft to well under one pixel for main-belt and more distant bodies.
- **`vmag-lim` is mandatory in practice.** The identification service refines every first-pass hit with a numerically integrated orbit; without a magnitude ceiling a crowded ecliptic field asks it to integrate hundreds of thousands of orbits and the request times out.

---

## 3. System Architecture

A clean, decoupled **Three-Tier Architecture** with zero ORM overhead:

```
┌────────────────────────────────────────────────────────┐
│             Tier 1: Next.js 16+ Frontend               │
│     App Router · React 19 · Tailwind CSS · Zustand     │
│              Port 3000 (Pure Presentation)             │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (JSON)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Tier 2: Node.js Express Server             │
│        TypeScript · mysql2/promise · Zod · Helmet      │
│               Port 4000 (API & File Gateway)           │
│                                                        │
│   Live read path ──► NASA/IPAC IRSA SIA2               │
│                 └──► NASA JPL Horizons / SBDB /        │
│                      Small-Body Identification         │
└──────────────┬───────────────────────────┬─────────────┘
               │ Direct SQL                │ File I/O
               ▼                           ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│     MySQL 8+ / MariaDB 10.4+  │ │   Local File Store   │
│        `spherex_atlas`        │ │     `storage/`       │
│  Auto-Provisioning / Migrated │ │ FITS / Previews /    │
│    `processing_jobs` Queue    │ │ Differences / Cache  │
└──────────────▲────────────────┘ └──────────▲───────────┘
               │ SQL Poll                    │ FITS I/O
               │ (Bounded Worker)            │ Reprojection
┌──────────────┴─────────────────────────────┴───────────┐
│             Tier 3: Python Science Worker              │
│       Astropy · NumPy · SciPy · photutils · Pillow     │
│             Daemon / Queue Consumer (No HTTP)          │
│                                                        │
│   Ingest path ──► IRSA SIA2 + IBE cutouts              │
│   Science path ─► JPL sb_ident + SBDB cross-match      │
└────────────────────────────────────────────────────────┘
```

### Strict architectural boundaries

- **Tier 1 (Frontend)**: Only presentation and user interaction. **Zero Next.js API routes (`app/api/*`) and zero database code.**
- **Tier 2 (Backend API)**: Express with raw parameterized SQL (`mysql2/promise`). Auto-provisions `spherex_atlas` on startup, runs migrations, validates with Zod, streams assets, and serves the **synchronous** NASA read path (archive discovery, ephemerides, orbits, field identification). **No Prisma, no Sequelize, no ORM.**
- **Tier 3 (Science Worker)**: Asynchronous daemon that downloads IRSA cutouts, performs WCS reprojection, flux-delta subtraction and DAOStarFinder extraction, then asks JPL which catalogued bodies were in the field. **Communicates exclusively via the MySQL `processing_jobs` table and the filesystem. Python exposes no HTTP endpoints.**

### Outbound request safety

Both tiers pin every outbound call to an explicit host allowlist (`irsa.ipac.caltech.edu`, `ssd.jpl.nasa.gov`, `ssd-api.jpl.nasa.gov`, `api.nasa.gov`), require HTTPS, reject embedded credentials, bound the response size and the timeout, and cache deterministic responses on disk under `storage/cache/`. Downloads are content-addressed by cutout URL, capped at `MAX_DOWNLOAD`, verified as FITS before use, and evicted least-recently-used once `MAX_CACHE` is exceeded.

---

## 4. Repository Structure

```text
NasaAppChallenge/
├── .env                        # NASA_API_KEY (git-ignored; create from .env.example)
├── next/                       # Tier 1: Next.js Frontend
│   ├── app/                    # App Router pages (explore, timeline, compare, review, team, admin)
│   ├── components/
│   │   ├── compare/
│   │   │   ├── ChangeSummary.tsx       # Candidate list + JPL identification badges
│   │   │   └── SolarSystemPanel.tsx    # NASA JPL identifications for a comparison
│   │   └── sky/MetadataPanel.tsx       # IRSA provenance for an observation
│   ├── hooks/                  # useApi, useJob, useObservations, useTheme
│   ├── lib/                    # API client, coordinates, formatters, types
│   ├── store/                  # Zustand client state
│   └── tests/                  # Vitest frontend tests
├── server/                     # Tier 2: Express Node.js Server
│   ├── src/
│   │   ├── config/             # Env schema & NASA endpoint constants
│   │   ├── controllers/        # archive, solar-system, moving-objects, observations, …
│   │   ├── db/
│   │   │   ├── connection.ts   # Pool, UTC pinning, JSON column normalisation
│   │   │   └── migrations/     # 001 initial · 002 observation reviews · 003 moving objects
│   │   ├── middleware/         # Rate limit, Zod validator, admin auth, error handler
│   │   ├── routes/             # health, bootstrap, regions, observations, jobs,
│   │   │                       # comparisons, archive, solar-system, files, admin
│   │   ├── schemas/            # Zod validation schemas
│   │   └── services/
│   │       ├── nasa-http.ts            # Allowlisted, bounded, cached transport
│   │       ├── irsa.service.ts         # IRSA SIA2 client + ObsCore normalisation
│   │       ├── jpl.service.ts          # Horizons, SBDB, sb_ident, NeoWs clients
│   │       ├── moving-object.service.ts# Stored identifications
│   │       └── integration-status.service.ts
│   └── tests/                  # Vitest API, unit and live-NASA tests
├── python/                     # Tier 3: Scientific Worker
│   ├── spherex/
│   │   ├── config.py           # Loads server/.env and root .env; paths and limits
│   │   ├── comparison.py       # WCS bilinear reprojection & sigma differences
│   │   ├── detection.py        # DAOStarFinder extraction & candidate classification
│   │   ├── fits.py             # FITS parsing, header-driven bad-pixel mask, LVF wavelengths
│   │   ├── irsa.py             # IRSA SIA2 discovery + IBE content-addressed cutouts
│   │   ├── jpl.py              # Horizons, SBDB, sb_ident, cross-matching
│   │   ├── jobs.py             # FETCH_OBSERVATIONS · COMPARE_EPOCHS · IDENTIFY_OBJECTS
│   │   └── previews.py         # Asinh-stretch WebP rendering
│   ├── tests/                  # Pytest science, integration and live-NASA tests
│   └── worker.py               # Worker daemon CLI
├── storage/                    # Unified asset repository
│   ├── demo/                   # Bundled demo dataset & manifest
│   ├── fits/                   # SPHEREx Level-2 cutouts (runtime downloads git-ignored)
│   ├── previews/               # WebP display previews
│   ├── differences/            # Difference & significance assets
│   └── cache/                  # IRSA / JPL response cache
├── content/                    # Team, mission, and region content
├── docs/                       # Architecture, API, Science, Deployment guides
└── scripts/                    # Structure verification & cleanup scripts
```

---

## 5. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | 22.0.0+ | `node --version` |
| **npm** | 10+ | Ships with Node |
| **Python** | 3.11 or 3.12 | `python --version` |
| **MySQL / MariaDB** | MySQL 8.0+ or MariaDB 10.4+ | Running on `localhost:3306`; the API creates the database itself |
| **Internet access** | — | Required for the live IRSA and JPL integrations |

A free NASA API key from <https://api.nasa.gov> is optional; it only enables the NeoWs endpoint.

---

## 6. Environment Variables

Configuration lives in two files. **Both the Express API and the Python worker read both of them**, so each value is defined once.

### `.env` (repository root)

| Variable | Default | Purpose |
|---|---|---|
| `NASA_API_KEY` | _(empty)_ | api.nasa.gov credential. Only used for NeoWs. Optional. |

### `server/.env`

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development` falls back to the bundled archive if MySQL is down |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | API listener |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed browser origin |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `localhost` / `3306` / `root` / _(empty)_ / `spherex_atlas` | Database connection |
| `STORAGE_PATH` / `CONTENT_PATH` | `../storage` / `../content` | Asset roots |
| `ADMIN_PASSWORD` | `change-me-before-publishing` | Must be unique and ≥16 characters when `NODE_ENV=production` |
| `ADMIN_SESSION_TTL_HOURS` | `24` | Admin session lifetime |
| `RATE_LIMIT_SEARCH_PER_MINUTE` | `60` | Observation search rate limit |
| `RATE_LIMIT_REVIEW_PER_MINUTE` | `120` | Review submission rate limit |
| **IRSA** | | |
| `IRSA_BASE_URL` | `https://irsa.ipac.caltech.edu` | Archive host |
| `IRSA_COLLECTION` | `spherex_qr3` | One of `spherex_qr3`, `spherex_qr3_deep`, `spherex_dr1`, `spherex_dr1_deep`, `spherex_dr1_cube` |
| `IRSA_TIMEOUT_MS` | `120000` | SIA2 request timeout |
| `IRSA_CACHE_TTL_SECONDS` | `86400` | SIA2 response cache lifetime |
| `IRSA_CUTOUT_SIZE_DEG` | `0.12` | Worker cutout size (≈70 px at 6.15″/px) |
| `IRSA_MAX_CUTOUT_SIZE_DEG` | `0.5` | Hard ceiling on a cutout |
| `FETCH_MAX_PRODUCTS` | `8` | Products materialised per fetch job |
| **JPL** | | |
| `JPL_TIMEOUT_MS` | `300000` | Identification can take 30–60 s |
| `JPL_CACHE_TTL_SECONDS` | `604800` | Ephemerides are deterministic, so they cache well |
| `JPL_OBSERVER_CODE` | `500` | MPC observatory code (500 = geocentric) |
| `JPL_VMAG_LIMIT` | `22` | Apparent-magnitude ceiling for identification |
| `JPL_MATCH_TOLERANCE_ARCSEC` | `60` | How close a candidate must be to count as the same object |
| `RATE_LIMIT_ARCHIVE_PER_MINUTE` | `20` | Live archive search rate limit |
| `RATE_LIMIT_SOLAR_SYSTEM_PER_MINUTE` | `20` | Live JPL endpoint rate limit |
| **Worker limits** | | |
| `MAX_DOWNLOAD` | `52428800` | 50 MB cap per archive download |
| `MAX_CACHE` | `2147483648` | 2 GB cutout cache budget |
| `MAX_PIXELS` | `16777216` | Pixel budget per image plane |
| `JOB_TIMEOUT_SECONDS` | `300` | Stale-job reclaim threshold |
| `MAX_JOB_ATTEMPTS` | `3` | Retries before a job stays failed |

### `next/.env.local`

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | API base used by the browser |
| `API_UPSTREAM_ORIGIN` | `http://127.0.0.1:4000` | Where `/api/*` is proxied in dev |

---

## 7. Running the Project Locally

All commands are run from the project root, `D:\NasaAppChallenge\` (shown here in a POSIX-style shell; on Windows `cmd`/PowerShell use `copy` instead of `cp`).

### Step 1 — Configure the environment

```bash
cp .env.example .env
cp server/.env.example server/.env
cp next/.env.example next/.env.local
```

Then edit the files:

1. **`.env`** — paste your key into `NASA_API_KEY`, or leave the placeholder if you do not have one. If `.env` already exists with a working key, leave it exactly as it is; nothing in the project overwrites it.
2. **`server/.env`** — set `DB_USER` and `DB_PASSWORD` to your MySQL credentials. Leave the rest at their defaults for local use.
3. **`next/.env.local`** — set `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api` for the simplest local setup.

### Step 2 — Install dependencies

```bash
npm --prefix server install
npm --prefix next install
python -m pip install -r python/requirements.txt
```

### Step 3 — Start MySQL

Make sure your MySQL or MariaDB server is listening on `localhost:3306`. You do **not** need to create a database: the API creates `spherex_atlas`, applies all three migrations and seeds the bundled demo dataset on first start.

### Step 4 — Launch the three tiers

Open three terminals, all in `D:\NasaAppChallenge\`.

**Terminal 1 — Express API**

```bash
npm --prefix server run dev
```

Wait for `Server listening on http://0.0.0.0:4000`. Confirm the integrations are wired up:

```bash
curl http://localhost:4000/api/health
```

**Terminal 2 — Python science worker**

```bash
python python/worker.py
```

This polls the `processing_jobs` table. To drain the queue once and exit instead (useful for cron), run:

```bash
python python/worker.py --once
```

**Terminal 3 — Next.js frontend**

```bash
npm --prefix next run dev
```

Open <http://localhost:3000>.

### Step 5 — Pull live data from NASA and watch it flow

```bash
curl -X POST http://localhost:4000/api/observations/search -H "Content-Type: application/json" -d "{\"ra\":270.0,\"dec\":66.56,\"radiusDeg\":0.05,\"band\":2}"
```

This returns `{"status":"queued","jobId":"…"}`. The worker then discovers SPHEREx products at the North Ecliptic Pole through IRSA SIA2, downloads a bounded cutout of each from IRSA IBE, reads the FITS, renders a preview and writes an `observations` row. Re-run the same request and it answers `{"status":"cached", …}` with the ingested epochs.

Pick two of the returned observation IDs and compare them:

```bash
curl -X POST http://localhost:4000/api/comparisons -H "Content-Type: application/json" -d "{\"observationAId\":\"obs-…\",\"observationBId\":\"obs-…\"}"
```

The worker reprojects epoch B onto epoch A's WCS, computes the flux difference and significance maps, extracts change candidates, and then automatically queues a JPL identification pass for them. Open the result in the browser at `http://localhost:3000/compare?id=<comparisonId>` and expand **Comparison measurements → Solar-system identification**.

> **Choosing a field matters.** The Galactic centre is saturated in SPHEREx's longer bands — over 60 % of pixels carry `OVERFLOW`/`SUR_ERROR` flags — so few clean sources survive. The deep fields (North Ecliptic Pole `270.0, +66.56`; South Ecliptic Pole `90.0, −66.56`) have the most epochs and the cleanest photometry. For a field that actually contains asteroids, use one near the ecliptic such as `45.0, +16.6`.

### Running against the bundled archive without MySQL

If MySQL is unavailable and `NODE_ENV=development`, the API serves the bundled IRSA dataset from `storage/demo/` with SQLite-backed reviews. The **live** NASA endpoints (`/api/archive/*` and `/api/solar-system/*`) still work in this mode, because they do not touch the database.

---

## 8. API Reference (NASA integrations)

All responses use the envelope `{"ok": true, "data": …}` or `{"ok": false, "error": {"code", "message"}}`.

### Archive — NASA/IPAC IRSA

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/archive/collections` | SPHEREx collections the SIA2 service publishes |
| `POST` | `/api/archive/search` | Live SIA2 discovery. Body: `{ra, dec, radiusDeg, collection?, band?, limit?}` |
| `POST` | `/api/archive/cutout-url` | Build an IBE cutout URL. Body: `{accessUrl, ra, dec, sizeDeg?}` |

```bash
curl -X POST http://localhost:4000/api/archive/search \
  -H "Content-Type: application/json" \
  -d "{\"ra\":266.4,\"dec\":-29.0,\"radiusDeg\":0.05,\"limit\":5}"
```

### Solar system — NASA JPL

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/solar-system/identify` | Known bodies in a field. Body: `{ra, dec, halfWidthDeg, obsTime, vmagLimit?, twoPass?}` |
| `GET` | `/api/solar-system/ephemeris` | Horizons ephemeris. Query: `target`, and either `epoch` or `start`+`stop`+`step` |
| `GET` | `/api/solar-system/objects/:designation` | SBDB orbital elements and physical parameters |
| `GET` | `/api/solar-system/neo/:identifier` | NeoWs near-Earth-object data (**requires `NASA_API_KEY`**). Accepts a minor-planet number, a NeoWs id or an SBDB SPK id |

```bash
curl "http://localhost:4000/api/solar-system/ephemeris?target=433&epoch=2026-01-01T00:00:00Z"
curl "http://localhost:4000/api/solar-system/objects/433"
```

### Comparisons

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/comparisons/:id` | Comparison with observations, candidates and `movingObjects` |
| `GET` | `/api/comparisons/:id/moving-objects` | Stored JPL identifications |
| `POST` | `/api/comparisons/:id/identify` | Queue a fresh identification pass. Body: `{vmagLimit?, toleranceArcsec?}` |

Full API documentation lives in [`docs/API.md`](docs/API.md).

---

## 9. Processing Jobs

| Job type | Queued by | What it does |
|---|---|---|
| `FETCH_OBSERVATIONS` | `POST /api/observations/search` when nothing is cached | IRSA SIA2 discovery → IBE cutout download → FITS validation → preview → `observations` rows |
| `COMPARE_EPOCHS` | `POST /api/comparisons` | WCS reprojection → flux difference → significance map → DAOStarFinder candidates; queues `IDENTIFY_OBJECTS` when candidates are found |
| `IDENTIFY_OBJECTS` | `COMPARE_EPOCHS`, or `POST /api/comparisons/:id/identify` | JPL sb_ident over the field at epoch B → cross-match to candidates → SBDB orbits → `moving_object_matches` rows |

---

## 10. Testing

Testing is split into **offline** suites (pure logic, parsing, normalisation, guard rails, job handlers against a database stub) and **live** suites that talk to the real NASA services.

```bash
# Everything: structure, all three tiers, then production builds
npm run verify
```

### Individual suites

```bash
npm run verify:structure   # Architectural boundary checks
npm run test:next          # Frontend unit tests (Vitest)
npm run test:server        # API, NASA unit and NASA live tests (Vitest)
npm run test:python        # Science, job and NASA live tests (pytest)
npm run typecheck          # tsc --noEmit for both TypeScript tiers
```

### Running without network access

The live NASA suites are skipped when `SKIP_LIVE_NASA_TESTS=1`:

```bash
SKIP_LIVE_NASA_TESTS=1 npm run test:server
SKIP_LIVE_NASA_TESTS=1 npm run test:python
```

Live responses are cached under `storage/cache/`, so a second run of either suite is fast.

### What the live suites actually verify

- IRSA SIA2 returns usable SPHEREx products whose wavelengths fall inside 0.6–5.5 µm, whose epochs parse, whose pixel scale is 6.15″, and which genuinely cover the queried position.
- An IBE cutout downloads, parses as FITS with a celestial WCS and a variance plane, is centred on the requested position to under two pixels, and reports an LVF wavelength consistent with the product's spectral bounds.
- Cutouts are content-addressed: the same region resolves to the same cached file; a different region does not.
- SBDB returns the published orbit of 433 Eros (a = 1.4582 au, e = 0.2229, i = 10.83°, H = 10.4).
- A Horizons ephemeris is physically consistent, and the apparent-motion rates it reports reproduce the position change between steps to within 5 %.
- **Cross-service validation**: the position JPL's Small-Body Identification service reports for an object agrees with an independent Horizons ephemeris for the same instant to under 2″.
- `MAX_DOWNLOAD`, cutout-size, coordinate-range, collection-name and host-allowlist guards all reject bad input before any network call.

---

## 11. Key Application Features

| Feature | Route | Description |
|---|---|---|
| **Mission Explorer** | `/` | Mission introduction, live IRSA status, key cadence metrics, and featured sky regions. |
| **Explore Sky** | `/explore` | Interactive sky image viewer with crosshair coords, object name lookup, detector band selector, and a metadata inspector showing full IRSA provenance. |
| **Cadence Timeline** | `/timeline` | Multi-epoch animation player with variable playback speed, looping, crossfading, and epoch pair selection. |
| **Change Comparison** | `/compare` | Slide, Blink, Blend, Side-by-side, Change map and Noise check views, plus the **Solar-system identification** panel backed by NASA JPL. |
| **Citizen Science Review** | `/review` | Classification interface for candidates with community agreement tracking. |
| **Mission & Science** | `/about` | Linear Variable Filters, 102 spectral channels, WCS reprojection, and data provenance. |
| **Team A-JINX** | `/team` | Team attribution and NASA Space Apps Challenge context. |
| **Operations Dashboard** | `/admin` | API health, MySQL connection, worker heartbeat, job queue control, and storage volume. |

---

## 12. Scientific Methodology

1. **Archive discovery**: IRSA SIA2 positional query returns ObsCore rows; each is normalised onto the platform's observation schema with its detector, UTC epoch and spectral bounds.
2. **Bounded retrieval**: A fixed-size cutout centred on the queried position is downloaded from IRSA IBE, so both epochs cover the same patch of sky and can be differenced directly.
3. **Astrometric WCS reprojection**: Epoch B is resampled onto Epoch A's celestial WCS grid using bilinear interpolation, with the bad-pixel mask propagated through the same transform.
4. **Photometric gating**: Exposures must agree on `BUNIT`; a mismatch aborts the comparison rather than producing a meaningless delta.
5. **Calibrated background subtraction**: Local background is estimated by sigma-clipping (median ±3σ) and subtracted additively, preserving genuine point-source flux deltas in MJy/sr.
6. **Statistical significance mapping**: Flux deltas are divided by propagated detector variance, σ_Δ = √(σ_A² + σ_B²).
7. **DAOStarFinder extraction**: Point sources above 5σ are extracted from both epochs, matched with a Hungarian assignment, and classified as apparent motion, brightness change, or a newly appeared source.
8. **Solar-system identification**: JPL's Small-Body Identification service is asked which catalogued bodies occupied the field at epoch B; matches within the tolerance are recorded with their SBDB orbit, and the detector's own classification is kept alongside the JPL opinion rather than replaced by it.

---

## 13. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Database connection failed` on API start | MySQL is not running or `server/.env` credentials are wrong. In `development` the API falls back to the bundled archive. |
| `IRSA cutout request failed (422): Arrays do not overlap` in worker logs | Normal. The SIA2 footprint intersects the search circle but the requested cutout centre falls off that detector array. The worker skips the product and reports it in the job's `failures`. |
| Comparison completes with zero candidates | The field has no clean unsaturated sources — common in the Galactic plane at long wavelengths. Try a deep field, a shorter band, or a larger `IRSA_CUTOUT_SIZE_DEG`. |
| Identification returns zero objects | Expected away from the ecliptic. The ecliptic poles contain essentially no minor planets. Use a near-ecliptic field. |
| JPL identification times out | Lower `JPL_VMAG_LIMIT` or reduce the field half-width. Each magnitude of depth multiplies the orbits JPL must integrate. |
| `NASA_API_KEY is not configured` from `/api/solar-system/neo/…` | Only NeoWs needs a key. Put one in the repository-root `.env`; everything else keeps working without it. |
| Observation times look shifted by your UTC offset | Data seeded by a build older than the UTC fix. Drop the `spherex_atlas` database and restart the API to re-seed. |

---

## 14. Team Attribution

Developed for the **NASA Space Apps Challenge 2026** under the **"Planet X and SPHEREx"** challenge by **Team A-JINX** from **Barisal, Bangladesh**:

- **MD. Jibon Howlader** (`@programmerjibon`)
- **Asfack Ahamed Siam** (`@asfack_ahamed`)
- **MD. Fahim Ahmed** (`@mihafyor`)
- **Turjo Roy** (`@turjo12345`)

Imagery and archive data courtesy of the **NASA/IPAC Infrared Science Archive (IRSA)** and the **SPHEREx Science Team**. Ephemerides, orbits and small-body identifications courtesy of **NASA JPL Solar System Dynamics**.

---

## 15. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
