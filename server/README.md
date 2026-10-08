# SPHEREx Atlas Backend API

Express + Node.js 22 + MySQL (`mysql2/promise`) backend server for the SPHEREx Sky Change Explorer.

## Features
- **Direct SQL**: Clean MySQL access with connection pooling using `mysql2/promise`. No ORM or Prisma.
- **Auto-Provisioning**: Automatically creates database `spherex_atlas` if missing on startup and applies schema migrations.
- **Demo Data Seeding**: Automatically seeds real NASA/IPAC IRSA SPHEREx observations, comparisons, and featured regions.
- **Job Queue**: Transactionally queues and manages `FETCH_OBSERVATIONS` and `COMPARE_EPOCHS` jobs for the Python scientific worker.
- **Security & Validation**: Helmet headers, Zod schema validation, sliding-window rate limiting, and hashed admin sessions.

## Scripts
- `npm run dev` - Start development server with tsx
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` - Start production server from `dist/server.js`
- `npm run typecheck` - Run TypeScript check
- `npm test` - Run Vitest test suite with Supertest
