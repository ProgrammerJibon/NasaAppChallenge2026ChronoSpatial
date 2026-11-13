# Chrono & Spatial — Deployment & Operational Guide

---

## 1. System Requirements

- **Node.js**: 22.0.0 or higher
- **npm**: 10.0.0 or higher
- **Python**: 3.11 or 3.12 with pip
- **MySQL**: 8.0+ or MariaDB 10.6+ running on `localhost:3306`

---

## 2. Initial Setup

### 2.1 Clone and Environment Setup
Create environment files in `server/` and `next/`:

```bash
# Server environment
cp server/.env.example server/.env

# Next.js environment
cp next/.env.example next/.env.local
```

The browser calls `/api` on the same host as the frontend. Next.js proxies those requests to `API_UPSTREAM_ORIGIN`, which must be reachable by the Next.js server. Set it to the deployed API origin **before building** the frontend; do not leave it pointing at a local development server. For example, if the API runs at `https://api.example.org`, set `API_UPSTREAM_ORIGIN=https://api.example.org` (without `/api`). Keep `NEXT_PUBLIC_API_BASE_URL=/api` so a published browser never tries to contact its own `localhost`.

### 2.2 Configure Database Credentials (`server/.env`)
Ensure MySQL is accessible:
```env
PORT=4000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=spherex_atlas
ADMIN_PASSWORD=<a-unique-secret-of-at-least-16-characters>
STORAGE_PATH=../storage
CORS_ORIGIN=http://localhost:3000
```

> **Note**: You do not need to manually create the `spherex_atlas` database. The server auto-creates the database, runs migrations, and seeds the demo dataset on startup. Set `NODE_ENV=production` and a unique admin password of at least 16 characters before publishing; the API refuses to start in production with the example or old default password.

---

## 3. Python Science Worker Setup

Install scientific dependencies:

```bash
pip install -r python/requirements.txt
```

Verify tests:
```bash
python -m pytest python/tests
```

---

## 4. Running the Complete System

To run the application locally, open three terminal windows:

### Terminal 1: Node.js Express API Server (Tier 2)
```bash
npm --prefix server run dev
# Server will start on http://localhost:4000
# Auto-creates spherex_atlas, applies migrations, seeds demo dataset.
```

### Terminal 2: Python Science Worker (Tier 3)
```bash
python python/worker.py
# Science daemon polls processing_jobs and processes FITS comparisons.
```

### Terminal 3: Next.js Frontend (Tier 1)
```bash
npm --prefix next run dev
# Web application available at http://localhost:3000
```

---

## 5. Verification Commands

Run the full system verification suite from the project root:

```bash
# Runs structure checks, unit tests across tiers, and production builds:
npm run verify
```

Individual checks:
```bash
# Verify directory structure and constraints
npm run verify:structure

# Run Next.js unit tests (Vitest)
npm run test:next

# Run Server unit tests (Vitest)
npm run test:server

# Run Python scientific worker tests (Pytest)
npm run test:python

# Build Server production bundle
npm run build:server

# Build a runnable Next.js standalone bundle (includes public images and videos)
npm --prefix next run build:standalone

# Start the standalone frontend after building it
npm --prefix next start
```

---

## 6. Production Deployment Strategy

- **Tier 1 (Frontend)**: Deploy `next/` to Vercel, Cloudflare Pages, or containerize with standard Node.js standalone output.
- **Tier 2 (API Gateway)**: Containerize `server/` with Docker, bind to private MySQL and shared persistent volume mounted at `/app/storage`.
- **Tier 3 (Worker Daemon)**: Deploy `python/` as a scalable Kubernetes replica set or systemd daemon pointing to the same MySQL database and persistent volume `/app/storage`.

Before opening the site to visitors, confirm that `/api/health` works through the frontend domain and that an observation preview loads. Production requires MySQL to start. In development, an unavailable MySQL server triggers the bundled local archive: viewing and SQLite-backed observation reviews remain available, while new processing jobs do not run. Keep the storage volume persistent so saved reviews survive restarts.
