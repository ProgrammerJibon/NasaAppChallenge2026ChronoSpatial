import express from "express";
import crypto from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "./config/env.js";
import { loadDemoManifest } from "./services/demo.service.js";
import { observationReviewSchema } from "./schemas/observation-review.schemas.js";
import { sha256, generateId, generateToken, hashToken } from "./utils/hash.js";
import { sendError, sendSuccess } from "./utils/response.js";
import { cleanCache, getStorageStatus } from "./controllers/admin.controller.js";
import { checkArchiveAssets, checkPublicPages } from "./services/platform-monitor.service.js";

/** Bundled IRSA images with a durable SQLite store for observation reviews when MySQL is unavailable. */
export async function createDemoFallbackApp(options: { reviewDbPath?: string } = {}) {
  const manifest = await loadDemoManifest();
  if (!manifest) return null;

  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : [env.CORS_ORIGIN, "http://localhost:3000"] }));
  app.use(express.json({ limit: "2mb" }));

  const regions = manifest.featured_regions;
  const observations = manifest.observations;
  const comparisons = manifest.comparisons;
  const candidates = manifest.candidates;
  const observationById = new Map(observations.map(item => [item.id, item]));
  const comparisonById = new Map(comparisons.map(item => [item.id, item]));
  const reviewDbPath = options.reviewDbPath ?? path.join(env.resolvedStoragePath, "observation-reviews.sqlite");
  await fs.mkdir(path.dirname(reviewDbPath), { recursive: true });
  const reviewDb = new DatabaseSync(reviewDbPath);
  reviewDb.exec(`CREATE TABLE IF NOT EXISTS observation_reviews (
    id TEXT PRIMARY KEY, observation_id TEXT NOT NULL, visitor_hash TEXT NOT NULL,
    classification TEXT NOT NULL, confidence REAL NOT NULL, flags_json TEXT NOT NULL,
    note TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(observation_id, visitor_hash)
  ); CREATE INDEX IF NOT EXISTS idx_observation_reviews_observation ON observation_reviews(observation_id);
  CREATE TABLE IF NOT EXISTS local_admin_sessions (
    token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
  );`);
  const adminAuth: express.RequestHandler = (req, res, next) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7).trim()
      : typeof req.headers["x-admin-token"] === "string" ? req.headers["x-admin-token"].trim() : "";
    if (!token) return void sendError(res, "UNAUTHORIZED", "Admin authentication token is required.", 401);
    const session = reviewDb.prepare("SELECT expires_at FROM local_admin_sessions WHERE token_hash = ?")
      .get(hashToken(token)) as { expires_at: number } | undefined;
    if (!session || session.expires_at <= Date.now()) {
      return void sendError(res, "INVALID_TOKEN", "Admin session has expired or is invalid.", 401);
    }
    next();
  };
  const visitorHash = (value: unknown) => typeof value === "string" && value.length >= 8 && value.length <= 128 ? sha256(value) : null;
  const ownReview = (observationId: string, visitor: string) => {
    const row = reviewDb.prepare(`SELECT id, observation_id, classification, confidence, flags_json, note, created_at, updated_at
      FROM observation_reviews WHERE observation_id = ? AND visitor_hash = ?`).get(observationId, visitor) as any;
    return row ? { id: row.id, observationId: row.observation_id, classification: row.classification,
      confidence: row.confidence, flags: JSON.parse(row.flags_json), note: row.note,
      createdAt: row.created_at, updatedAt: row.updated_at } : null;
  };
  const withComparisonDetails = (comparison: (typeof comparisons)[number]) => ({
    ...comparison,
    observationA: observationById.get(comparison.observation_a_id) ?? null,
    observationB: observationById.get(comparison.observation_b_id) ?? null,
    candidates: candidates.filter(item => item.comparison_id === comparison.id),
  });

  app.get("/api/health", (_req, res) => sendSuccess(res, { status: "demo", database: "offline", dataSource: "bundled IRSA observations" }));
  app.post("/api/admin/login", (req, res) => {
    const password = req.body?.password;
    if (typeof password !== "string" || !password) {
      return sendError(res, "INVALID_REQUEST", "Admin password is required.", 400);
    }
    const supplied = Buffer.from(sha256(password), "hex");
    const configured = Buffer.from(sha256(env.ADMIN_PASSWORD), "hex");
    if (!crypto.timingSafeEqual(supplied, configured)) {
      return sendError(res, "INVALID_CREDENTIALS", "Incorrect admin password", 401);
    }
    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.ADMIN_SESSION_TTL_HOURS * 3600 * 1000);
    reviewDb.prepare("INSERT INTO local_admin_sessions (token_hash, expires_at) VALUES (?, ?)")
      .run(hashToken(token), expiresAt.getTime());
    return sendSuccess(res, { token, expiresAt: expiresAt.toISOString() });
  });
  app.post("/api/admin/logout", adminAuth, (req, res) => {
    const token = req.headers.authorization?.slice(7).trim() ?? "";
    reviewDb.prepare("DELETE FROM local_admin_sessions WHERE token_hash = ?").run(hashToken(token));
    return sendSuccess(res, { message: "Logged out successfully" });
  });
  app.get("/api/admin/status", adminAuth, (_req, res) => sendSuccess(res, {
    mode: "local-archive",
    apiHealth: "online",
    databaseHealth: "local",
    workerStatus: "offline",
    metrics: {
      totalObservations: observations.length,
      totalComparisons: comparisons.length,
      totalCandidates: candidates.length,
      jobs: { queued: 0, processing: 0, completed: 0, failed: 0 },
    },
    uptimeSeconds: Math.floor(process.uptime()),
  }));
  app.get("/api/admin/overview", adminAuth, async (_req, res) => {
    const [site, previews, comparisonAssets] = await Promise.all([
      checkPublicPages(),
      checkArchiveAssets(observations.map(item => item.preview_path), "previews"),
      checkArchiveAssets(comparisons.flatMap(item => [item.aligned_a_path, item.aligned_b_path, item.difference_path, item.significance_path]), "comparisons"),
    ]);
    const reviewCount = reviewDb.prepare("SELECT COUNT(*) AS c, MAX(updated_at) AS last_at FROM observation_reviews")
      .get() as { c: number; last_at: string | null };
    return sendSuccess(res, {
      checkedAt: new Date().toISOString(), mode: "local-archive", site,
      archive: { regions: regions.length, observations: observations.length, comparisons: comparisons.length,
        candidates: candidates.length, previews, comparisonAssets },
      reviews: { observationReviews: reviewCount.c, candidateReviews: 0, lastAt: reviewCount.last_at },
    });
  });
  app.get("/api/admin/jobs", adminAuth, (_req, res) => sendSuccess(res, { jobs: [], total: 0 }));
  app.post("/api/admin/jobs/:id/retry", adminAuth, (_req, res) => sendError(res, "DATABASE_OFFLINE", "Processing jobs require MySQL and the science worker.", 503));
  app.post("/api/admin/jobs/:id/cancel", adminAuth, (_req, res) => sendError(res, "DATABASE_OFFLINE", "Processing jobs require MySQL and the science worker.", 503));
  app.get("/api/admin/storage", adminAuth, getStorageStatus);
  app.post("/api/admin/cache/cleanup", adminAuth, cleanCache);
  app.get("/api/bootstrap", (_req, res) => {
    const featuredRegion = regions.find(item => item.slug === manifest.default_region) ?? regions[0] ?? null;
    return sendSuccess(res, {
      featuredRegion,
      demoObservations: observations.filter(item => item.region_id === featuredRegion?.id).slice(0, 20),
      demoComparisonId: comparisons[0]?.id ?? null,
      serverStatus: "healthy",
      workerStatus: "offline",
      dataSource: { label: "NASA/IPAC IRSA SPHEREx Survey (local archive)", archive: "IRSA", collection: "spherex_qr3", level: "Level-2 Calibrated Spectral Images" },
    });
  });
  app.get("/api/regions", (_req, res) => sendSuccess(res, regions));
  app.get("/api/regions/:slug", (req, res) => {
    const region = regions.find(item => item.slug === req.params.slug || item.id === req.params.slug);
    return region ? sendSuccess(res, region) : sendError(res, "REGION_NOT_FOUND", "Sky region not found", 404);
  });
  app.get("/api/observations", (req, res) => {
    const band = Number(req.query.band);
    const filtered = observations.filter(item =>
      (!req.query.regionId || item.region_id === req.query.regionId) &&
      (!req.query.band || item.band_number === band)
    ).sort((a, b) => a.observation_date.localeCompare(b.observation_date));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    return sendSuccess(res, { observations: filtered.slice(offset, offset + limit), total: filtered.length });
  });
  app.get("/api/observations/:id", (req, res) => {
    const observation = observationById.get(req.params.id);
    return observation ? sendSuccess(res, observation) : sendError(res, "OBSERVATION_NOT_FOUND", "Observation not found", 404);
  });
  app.post("/api/observations/search", (req, res) => {
    const ra = Number(req.body?.ra), dec = Number(req.body?.dec);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) return sendError(res, "INVALID_COORDINATES", "Valid sky coordinates are required", 400);
    const radius = Math.min(5, Math.max(0.01, Number(req.body?.radiusDeg) || 0.25));
    const band = req.body?.band == null ? null : Number(req.body.band);
    const matches = observations.filter(item => {
      const deltaRa = Math.abs(item.ra - ra);
      const wrappedRa = Math.min(deltaRa, 360 - deltaRa);
      const separation = Math.hypot(wrappedRa * Math.cos(dec * Math.PI / 180), item.dec - dec);
      return separation <= radius && (band === null || item.band_number === band);
    });
    return sendSuccess(res, { status: "cached", observations: matches });
  });
  app.get("/api/comparisons/:id", (req, res) => {
    const comparison = comparisonById.get(req.params.id);
    return comparison ? sendSuccess(res, withComparisonDetails(comparison)) : sendError(res, "COMPARISON_NOT_FOUND", "Comparison not found", 404);
  });
  app.post("/api/comparisons", (req, res) => {
    const { observationAId, observationBId } = req.body ?? {};
    const comparison = comparisons.find(item =>
      (item.observation_a_id === observationAId && item.observation_b_id === observationBId) ||
      (item.observation_a_id === observationBId && item.observation_b_id === observationAId)
    );
    return comparison
      ? sendSuccess(res, { status: "completed", comparison: withComparisonDetails(comparison) })
      : sendError(res, "DATABASE_OFFLINE", "New scientific comparisons require the database and worker.", 503);
  });
  app.get("/api/review/next", (req, res) => {
    const excluded = new Set(String(req.query.exclude ?? "").split(","));
    const candidate = candidates.find(item => !excluded.has(item.id) && !excluded.has(item.comparison_id));
    const comparison = candidate && comparisonById.get(candidate.comparison_id);
    return candidate && comparison
      ? sendSuccess(res, { comparisonId: comparison.id, candidateId: candidate.id, candidate, comparison: withComparisonDetails(comparison) })
      : sendError(res, "NO_REVIEW_ITEMS", "No candidates are available in the local archive.", 404);
  });
  app.get("/api/reviews/stats/:comparisonId", (_req, res) => sendSuccess(res, { totalReviews: 0, classifications: {}, averageConfidence: 0 }));
  app.post("/api/observation-reviews", (req, res) => {
    const visitor = visitorHash(req.headers["x-visitor-id"]);
    if (!visitor) return sendError(res, "VISITOR_REQUIRED", "A browser review identifier is required.", 400);
    const parsed = observationReviewSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, "INVALID_REVIEW", "Check the review fields and try again.", 400);
    const input = parsed.data;
    if (!observationById.has(input.observationId)) return sendError(res, "OBSERVATION_NOT_FOUND", "Observation not found.", 404);
    const now = new Date().toISOString();
    reviewDb.prepare(`INSERT INTO observation_reviews
      (id, observation_id, visitor_hash, classification, confidence, flags_json, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(observation_id, visitor_hash) DO UPDATE SET
      classification=excluded.classification, confidence=excluded.confidence, flags_json=excluded.flags_json,
      note=excluded.note, updated_at=excluded.updated_at`)
      .run(generateId("orev"), input.observationId, visitor, input.classification, input.confidence,
        JSON.stringify(input.flags), input.note, now, now);
    return sendSuccess(res, ownReview(input.observationId, visitor), 201);
  });
  app.get("/api/observation-reviews/:observationId/mine", (req, res) => {
    const visitor = visitorHash(req.headers["x-visitor-id"]);
    if (!visitor) return sendError(res, "VISITOR_REQUIRED", "A browser review identifier is required.", 400);
    return sendSuccess(res, ownReview(req.params.observationId, visitor));
  });
  app.get("/api/observation-reviews/:observationId/stats", (req, res) => {
    const rows = reviewDb.prepare(`SELECT classification, COUNT(*) AS count FROM observation_reviews
      WHERE observation_id = ? GROUP BY classification`).all(req.params.observationId) as Array<{classification:string;count:number}>;
    const classifications = Object.fromEntries(rows.map(row => [row.classification, row.count]));
    return sendSuccess(res, { totalReviews: rows.reduce((sum, row) => sum + row.count, 0), classifications });
  });

  async function sendAsset(res: express.Response, relativePath: string | undefined) {
    if (!relativePath) return sendError(res, "FILE_NOT_FOUND", "Archive image not found", 404);
    const name = path.basename(relativePath);
    const folder = relativePath.includes("comparison") || relativePath.includes("difference") ? "comparisons" : "previews";
    const filePath = path.join(env.resolvedStoragePath, "demo", folder, name);
    try {
      await fs.access(filePath);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(filePath);
    } catch {
      return sendError(res, "FILE_NOT_FOUND", "Archive image not found", 404);
    }
  }
  app.get("/api/files/preview/:id", (req, res) => sendAsset(res, observationById.get(req.params.id)?.preview_path));
  app.get("/api/files/comparison/:id/:kind", (req, res) => {
    const comparison = comparisonById.get(req.params.id);
    const paths: Record<string, string | undefined> = {
      "aligned-a": comparison?.aligned_a_path,
      "aligned-b": comparison?.aligned_b_path,
      difference: comparison?.difference_path,
      significance: comparison?.significance_path,
    };
    return sendAsset(res, paths[req.params.kind]);
  });
  app.use("/api", (_req, res) => sendError(res, "DATABASE_OFFLINE", "This action requires the database and science worker.", 503));
  return app;
}
