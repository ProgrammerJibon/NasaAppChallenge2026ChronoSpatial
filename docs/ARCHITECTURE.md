# Chrono & Spatial — SPHEREx Sky Change Explorer
## System Architecture & Engineering Specification

---

## 1. Executive Summary

**Chrono & Spatial** is an open-source web application designed for NASA's **Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx)** mission. The application enables astronomers, researchers, and citizen scientists to explore repeat observations of the all-sky survey across its ~6-month cadence, identify temporal changes (such as variable stars, transients, asteroids, comets, and brown dwarfs), inspect scientific difference maps, and participate in peer review of candidate events.

The architecture is built from first principles with a clean, decoupled **Three-Tier Architecture**:

```
┌────────────────────────────────────────────────────────┐
│             Tier 1: Next.js 16+ Frontend               │
│          App Router · React 19 · Tailwind CSS          │
│               Port 3000 (Pure Presentation)            │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (JSON)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Tier 2: Node.js Express Server             │
│        TypeScript · mysql2/promise · Zod · Helmet      │
│                Port 4000 (API & File Gateway)          │
└──────────────┬───────────────────────────┬─────────────┘
               │ Direct SQL                │ File I/O
               ▼                           ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│        MySQL 8+ Database      │ │   Local File Store   │
│        `spherex_atlas`        │ │     `storage/`       │
│  Auto-Provisioning / Migrated │ │ FITS / Previews /    │
│    `processing_jobs` Queue    │ │ Differences / Demo   │
└──────────────▲────────────────┘ └──────────▲───────────┘
               │ SQL Poll                    │ FITS I/O
               │ (Bounded Worker)            │ Reprojection
┌──────────────┴─────────────────────────────┴───────────┐
│             Tier 3: Python Science Worker              │
│       Astropy · NumPy · SciPy · photutils · Pillow     │
│             Daemon / Queue Consumer (No HTTP)          │
└────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Pillars & Core Rules

### Rule 1: Clean Separation of Responsibilities
- **Frontend (`next/`)**: Handles UI, visualization controls, interactive celestial crosshairs, swipe/blink comparison renderers, and responsive user flows. **No backend routes, no database clients, and no ORM packages.**
- **Backend API (`server/`)**: Provides authenticated administrative endpoints, spatial coordinate queries, job queueing, rate limiting, and secure file streaming. Communicates with MySQL using **raw parameterized SQL** (`mysql2/promise`). **No Prisma, no Sequelize, and no ORM.**
- **Science Worker (`python/`)**: Computes astrometric reprojection, photometric difference maps, and point-source extraction using Astropy, SciPy, and photutils. Communicates **strictly via the MySQL `processing_jobs` table** and the filesystem. **Python exposes no HTTP endpoints.**

### Rule 2: Scientific Authenticity
- Preserves genuine NASA/IPAC IRSA Level-2 SPHEREx products (FITS format).
- Accurately conveys the relationship between the 6 physical detector arrays (equipped with Linear Variable Filters) and the mission-level 102 spectral channels.
- Employs celestial WCS reprojection and calibrated pixel delta subtraction in place of synthetic CSS blending.

### Rule 3: Zero-Overhead Database Interaction
- Database schemas are maintained through versioned SQL scripts in `server/src/db/migrations/`.
- Database bootstrap is fully automated: on boot, the Node server creates `spherex_atlas` if not present, applies pending migrations, and seeds the curated demo dataset from `storage/demo/manifest.json`.

---

## 3. Tier Details & Data Flow

### 3.1 Frontend Tier (`next/`)
- **Framework**: Next.js 16 (Turbopack) with React 19.
- **Styling**: Tailwind CSS with custom astronomical palette.
- **State Management**:
  - `zustand` for viewer interactions (zoom, pan, crosshair position, active display mode).
  - Native React hooks for asynchronous data loading (`useApi`, `useJob`, `useObservations`).
- **Pages**:
  - `/` (Home): Mission introduction, key statistics, featured sky regions, and getting-started walkthrough.
  - `/explore` (Explore Sky): Sky image viewer, coordinate and region lookup, band selector, metadata inspector, and epoch observation strip.
  - `/timeline` (Timeline Player): Chronological cadence animation with adjustable frame rate, looping, crossfade, and multi-epoch comparison selector.
  - `/compare` (Change Comparison): Multi-mode comparison engine (Side-by-side, Swipe, Blink, Flux Difference) with candidate overlays and photometric summaries.
  - `/review` (Citizen Science Review): Peer classification interface with agreement scoring, confidence selection, and telemetry notes.
  - `/about` (Mission & Science): Scientific methodology, Linear Variable Filter explanation, and archive citations.
  - `/team` (Team A-JINX): Team attribution, member profiles, and NASA Space Apps Challenge details.
  - `/admin` (System Operations): Live service health, MySQL metrics, worker heartbeat, queue management (retry/cancel), and disk storage telemetry.

### 3.2 Backend API Tier (`server/`)
- **Runtime**: Node.js 22+ with Express 5 and TypeScript.
- **Security**:
  - `helmet` for HTTP security headers.
  - Strict input validation on all routes via `zod`.
  - In-memory token bucket rate limiting for public queries.
  - Cryptographic token hashing for administrative session security.
- **Database Connection**: Connection pooling via `mysql2/promise` with automatic reconnection.
- **Queue Gateway**: Enqueues science tasks (`compare_observations`, `extract_candidates`, `fetch_irsa_observations`) into `processing_jobs` table for asynchronous pickup by the Python worker.

### 3.3 Science Worker Tier (`python/`)
- **Runtime**: Python 3.12.
- **Libraries**: Astropy (WCS, FITS, units), NumPy, SciPy (sigma-clipping), photutils (DAOStarFinder), Pillow.
- **Lifecycle**: Runs as a daemon worker (`python/worker.py`). Loops over pending `processing_jobs` with status `queued`, updates progress, executes astronomical computations, and outputs aligned WebP and FITS assets.

---

## 4. Directory Structure

```text
NasaAppChallenge/
├── next/                 # Tier 1: Next.js Frontend
│   ├── app/              # App Router Pages
│   ├── components/       # UI, Layout, Sky, Compare, Timeline, Review
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # API Client, Constants, Coordinates, Formatters
│   ├── store/            # Zustand Stores
│   └── tests/            # Vitest Unit Tests
├── server/               # Tier 2: Express Node.js API
│   ├── src/
│   │   ├── config/       # Environment & Settings
│   │   ├── controllers/  # Route Controllers
│   │   ├── db/           # Connection, Migrations, Bootstrap
│   │   ├── middleware/   # Rate Limiter, Validator, Auth, Error Handler
│   │   ├── routes/       # Express Route Handlers
│   │   ├── schemas/      # Zod Schemas
│   │   ├── services/     # Business & Database Services
│   │   └── utils/        # Cryptography & Response Formatting
│   └── tests/            # Vitest API Integration Tests
├── python/               # Tier 3: Scientific Worker
│   ├── spherex/          # Core Science Engine Package
│   │   ├── comparison.py # WCS Bilinear Reprojection & Sigma Differences
│   │   ├── detection.py  # DAOStarFinder Source Extraction
│   │   ├── fits.py       # FITS Header & Array Extraction
│   │   ├── irsa.py       # NASA/IPAC IRSA Query Client
│   │   ├── jobs.py       # Job Queue Handler
│   │   └── previews.py   # Asinh Stretch WebP Image Rendering
│   ├── tests/            # Pytest Science Tests
│   └── worker.py         # Worker Daemon CLI
├── storage/              # Unified Asset Store
│   ├── demo/             # Pre-packaged Demo Dataset & Manifest
│   ├── fits/             # Genuine SPHEREx Level-2 FITS Files
│   ├── previews/         # WebP Display Previews
│   ├── differences/      # Difference & Significance Assets
│   └── cache/            # Ephemeral Worker Cache
├── content/              # Team, Mission, and Region Content Files
├── docs/                 # System Documentation
└── scripts/              # Verification & Maintenance Scripts
```
