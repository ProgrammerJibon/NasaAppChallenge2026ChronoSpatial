# Chrono & Spatial — SPHEREx Sky Change Explorer

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org)
[![SPHEREx Mission](https://img.shields.io/badge/Mission-SPHEREx-purple.svg)](https://spherex.caltech.edu)
[![Frontend](https://img.shields.io/badge/Next.js-16%20Turbopack-black.svg)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Express-TypeScript%20%7C%20mysql2-green.svg)](https://expressjs.com)
[![Science Engine](https://img.shields.io/badge/Astropy-SciPy%20%7C%20photutils-orange.svg)](https://www.astropy.org)
[![Tests Passing](https://img.shields.io/badge/Tests-55%2F55%20Passing-brightgreen.svg)]()

> A dedicated web platform for exploring multi-epoch near-infrared observations from NASA's **SPHEREx** mission, visualizing celestial changes over time, and discovering transient and moving objects across the sky.

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
SPHEREx does **not** capture 102 individual full-sky image files. Instead, the instrument employs **six 2048×2048 detector arrays**, each fitted with a **Linear Variable Filter (LVF)**. In an LVF, the bandpass varies continuously across the physical detector. As the spacecraft scans the sky, successive exposures sample celestial targets at slightly different wavelengths, synthesizing 102 spectral resolution elements across the mission survey.

**Chrono & Spatial** preserves and respects this authentic Level-2 archive data structure from the **NASA/IPAC Infrared Science Archive (IRSA)**.

---

## 2. System Architecture

Built from first principles around a clean, decoupled **Three-Tier Architecture** with zero ORM overhead:

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

### Strict Architectural Boundaries:
- **Tier 1 (Frontend)**: Only presentation and user interaction. **Zero Next.js API routes (`app/api/*`) and zero database code.**
- **Tier 2 (Backend API)**: High-performance Express API using raw parameterized SQL (`mysql2/promise`). Auto-provisions `spherex_atlas` on startup, runs migrations, validates requests with Zod, and streams assets. **No Prisma, no Sequelize, and no ORM.**
- **Tier 3 (Science Worker)**: Asynchronous daemon processing celestial WCS reprojection, flux delta subtraction, and DAOStarFinder source extraction. **Communicates exclusively via the MySQL `processing_jobs` table and filesystem. Python exposes no public HTTP endpoints.**

---

## 3. Repository Structure

```text
NasaAppChallenge/
├── next/                 # Tier 1: Next.js Frontend
│   ├── app/              # App Router Pages (explore, timeline, compare, review, team, admin)
│   ├── components/       # SkyViewer, Compare, Timeline, Review, UI, Motion
│   ├── hooks/            # useApi, useJob, useObservations, useTheme
│   ├── lib/              # API Client, Coordinates, Formatters, Types
│   ├── store/            # Zustand Client State
│   └── tests/            # Vitest Frontend Tests (15 tests)
├── server/               # Tier 2: Express Node.js Server
│   ├── src/
│   │   ├── config/       # Environment & Constants
│   │   ├── controllers/  # Route Controllers
│   │   ├── db/           # Connection Pool, Migrations, Auto-Bootstrap
│   │   ├── middleware/   # Rate Limit, Zod Validator, Admin Auth, Error Handler
│   │   ├── routes/       # Health, Bootstrap, Regions, Observations, Jobs, Files, Admin
│   │   ├── schemas/      # Zod Validation Schemas
│   │   └── services/     # SQL Business Logic & Job Queue Services
│   └── tests/            # Vitest API Tests (25 tests)
├── python/               # Tier 3: Scientific Worker
│   ├── spherex/          # Astropy Engine Package
│   │   ├── comparison.py # Celestial WCS Bilinear Reprojection & Sigma Differences
│   │   ├── detection.py  # DAOStarFinder Source Extraction
│   │   ├── fits.py       # FITS Headers & Image Arrays
│   │   ├── irsa.py       # NASA/IPAC IRSA API Query Client
│   │   ├── jobs.py       # Bounded Queue Job Consumer
│   │   └── previews.py   # Asinh Stretch WebP Image Rendering
│   ├── tests/            # Pytest Science Tests (15 tests)
│   └── worker.py         # Worker Daemon CLI
├── storage/              # Unified Asset Repository
│   ├── demo/             # Pre-extracted Demo Dataset & Manifest
│   ├── fits/             # Genuine SPHEREx Level-2 FITS Products
│   ├── previews/         # WebP Display Previews
│   ├── differences/      # Difference & Significance Assets
│   └── cache/            # Ephemeral Worker Cache
├── content/              # Team, Mission, and Region Content
├── docs/                 # Architecture, API, Science, Deployment Guides
└── scripts/              # Structure Verification & Cleanup Scripts
```

---

## 4. Quickstart Guide

### Prerequisites
- **Node.js**: v22.0.0 or higher
- **Python**: v3.11 or v3.12
- **MySQL**: 8.0+ or MariaDB 10.6+ running on `localhost:3306`

### 1. Environment Configuration

```bash
# Setup backend configuration
cp server/.env.example server/.env

# Setup frontend configuration
cp next/.env.example next/.env.local
```

### 2. Install Dependencies

```bash
# Install root, backend, and frontend packages
npm --prefix server install
npm --prefix next install

# Install Python scientific packages
pip install -r python/requirements.txt
```

### 3. Launch the 3 Tiers

Open three terminal windows:

#### Terminal 1 — Node.js Express API Server
```bash
npm --prefix server run dev
```
*Auto-creates database `spherex_atlas`, runs migrations, and seeds the real SPHEREx demo dataset. Listens on `http://localhost:4000`.*

#### Terminal 2 — Python Science Worker Daemon
```bash
python python/worker.py
```
*Listens on MySQL `processing_jobs` queue and computes astrometric reprojection and DAOStarFinder source extraction.*

#### Terminal 3 — Next.js Frontend
```bash
npm --prefix next run dev
```
*Open `http://localhost:3000` in your browser.*

---

## 5. Verification Suite

The repository includes automated test suites covering all three tiers (55 tests total):

```bash
# Run the complete verification suite (Structure, Tests, Builds)
npm run verify
```

### Individual Verification Commands
```bash
# 1. Verify architectural boundaries & constraints
npm run verify:structure

# 2. Run frontend unit tests (15/15 passing)
npm run test:next

# 3. Run backend API tests (25/25 passing)
npm run test:server

# 4. Run Python scientific tests (15/15 passing)
npm run test:python

# 5. Production build for Node.js API
npm run build:server

# 6. Production build for Next.js Web App
npm run build:next
```

---

## 6. Key Application Features

| Feature | Route | Description |
|---|---|---|
| **Mission Explorer** | `/` | Mission introduction, live IRSA status, key cadence metrics, and featured sky regions. |
| **Explore Sky** | `/explore` | Interactive sky image viewer with crosshair coords, object name lookup (M31, Orion, Pleiades), detector band selector, and metadata inspector. |
| **Cadence Timeline** | `/timeline` | Multi-epoch animation player with variable playback speed, looping, crossfading, and epoch pair selection for comparison. |
| **Change Comparison** | `/compare` | Four comparison modes: **Side-by-Side**, **Swipe**, **Blink**, and **Scientific Difference** (flux delta in MJy/sr and $\sigma$ significance maps) with candidate markers. |
| **Citizen Science Review** | `/review` | Citizen science inspection interface for classifying candidates (transient, moving object, artifact) with community agreement tracking. |
| **Mission & Science** | `/about` | Technical breakdown of Linear Variable Filters (LVF), 102 spectral channels, WCS reprojection, and data provenance. |
| **Team A-JINX** | `/team` | Team member attribution from Barisal, Bangladesh and NASA Space Apps Challenge context. |
| **Operations Dashboard** | `/admin` | Real-time monitoring of API health, MySQL connection, worker heartbeat, job queue control (retry/cancel), and disk storage volume. |

---

## 7. Scientific Methodology

1. **Astrometric WCS Reprojection**: Epoch B is resampled onto Epoch A's celestial World Coordinate System grid using bilinear interpolation (`reproject_interp`).
2. **Wavelength Compatibility Verification**: Exposures are gated to ensure central wavelengths match within **2%** tolerance to eliminate spurious color variations.
3. **Calibrated Background Subtraction**: Local background is estimated using sigma-clipping (median $\pm 3\sigma$) and subtracted, preserving genuine surface brightness changes in **MJy/sr**.
4. **Statistical Significance Mapping ($\sigma$)**: Flux deltas are divided by propagated detector variance from FITS extensions ($\sigma_{\Delta} = \sqrt{\sigma_A^2 + \sigma_B^2}$).
5. **DAOStarFinder Extraction**: Point-source anomalies exceeding $5\sigma$ significance are isolated and transformed into J2000 celestial coordinates $(\alpha, \delta)$.

---

## 8. Team Attribution

Developed for the **NASA Space Apps Challenge 2026** under the **"Planet X and SPHEREx"** challenge by **Team A-JINX** from **Barisal, Bangladesh**:

- **MD. Jibon Howlader** (`@programmerjibon`)
- **Asfack Ahamed Siam** (`@asfack_ahamed`)
- **MD. Fahim Ahmed** (`@mihafyor`)
- **Turjo Roy** (`@turjo12345`)

Data provided courtesy of the **NASA/IPAC Infrared Science Archive (IRSA)** and the **SPHEREx Science Team**.

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
