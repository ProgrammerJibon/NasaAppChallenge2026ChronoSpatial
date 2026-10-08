import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { query, execute } from "../db/connection.js";
import { generateId, generateToken, hashToken } from "../utils/hash.js";
import { sendSuccess, sendError } from "../utils/response.js";
import {
  listJobs,
  retryJob as retryJobService,
  cancelJob as cancelJobService,
  getWorkerStatus,
} from "../services/job.service.js";

export async function login(req: Request, res: Response) {
  const { password } = req.body;
  if (password !== env.ADMIN_PASSWORD) {
    return sendError(res, "INVALID_CREDENTIALS", "Incorrect admin password", 401);
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const sessionId = generateId("admin-sess");
  const expiresAt = new Date(
    Date.now() + env.ADMIN_SESSION_TTL_HOURS * 3600 * 1000
  );

  await execute(
    "INSERT INTO admin_sessions (id, token_hash, expires_at, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))",
    [sessionId, tokenHash, expiresAt]
  );

  return sendSuccess(res, {
    token,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function logout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers["x-admin-token"];
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : String(tokenHeader || "");

  if (token) {
    await execute("DELETE FROM admin_sessions WHERE token_hash = ?", [
      hashToken(token),
    ]);
  }

  return sendSuccess(res, { message: "Logged out successfully" });
}

export async function getStatus(_req: Request, res: Response) {
  const [dbRow] = await query<any>("SELECT 1 as test");
  const [obsCountRow] = await query<any>("SELECT COUNT(*) as c FROM observations");
  const [compCountRow] = await query<any>("SELECT COUNT(*) as c FROM comparisons");
  const [candCountRow] = await query<any>("SELECT COUNT(*) as c FROM change_candidates");
  const [jobStats] = await query<any>(`
    SELECT
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM processing_jobs
  `);

  const workerStatus = await getWorkerStatus();

  return sendSuccess(res, {
    apiHealth: "online",
    databaseHealth: dbRow ? "connected" : "disconnected",
    workerStatus,
    metrics: {
      totalObservations: Number(obsCountRow?.c || 0),
      totalComparisons: Number(compCountRow?.c || 0),
      totalCandidates: Number(candCountRow?.c || 0),
      jobs: {
        queued: Number(jobStats?.queued || 0),
        processing: Number(jobStats?.processing || 0),
        completed: Number(jobStats?.completed || 0),
        failed: Number(jobStats?.failed || 0),
      },
    },
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

export async function getJobs(req: Request, res: Response) {
  const { limit, offset, status } = req.query as any;
  const result = await listJobs(
    limit ? Number(limit) : 50,
    offset ? Number(offset) : 0,
    status ? String(status) : undefined
  );
  return sendSuccess(res, result);
}

export async function retryJob(req: Request, res: Response) {
  const id = String(req.params.id);
  const retried = await retryJobService(id);
  if (!retried) {
    return sendError(
      res,
      "RETRY_FAILED",
      `Job ${id} cannot be retried (must be failed or cancelled).`,
      400
    );
  }
  return sendSuccess(res, { id, status: "queued" });
}

export async function cancelJob(req: Request, res: Response) {
  const id = String(req.params.id);
  const cancelled = await cancelJobService(id);
  if (!cancelled) {
    return sendError(
      res,
      "CANCEL_FAILED",
      `Job ${id} cannot be cancelled (must be queued or processing).`,
      400
    );
  }
  return sendSuccess(res, { id, status: "cancelled" });
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(full);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        total += stat.size;
      }
    }
  } catch {
    // ignore missing directories
  }
  return total;
}

export async function getStorageStatus(_req: Request, res: Response) {
  const storage = env.resolvedStoragePath;
  const dirs = ["fits", "previews", "differences", "comparisons", "cache", "logs", "demo"];
  const usage: Record<string, { bytes: number; human: string }> = {};

  let grandTotal = 0;
  for (const d of dirs) {
    const size = await getDirSize(path.join(storage, d));
    grandTotal += size;
    usage[d] = {
      bytes: size,
      human: `${(size / (1024 * 1024)).toFixed(2)} MB`,
    };
  }

  return sendSuccess(res, {
    totalBytes: grandTotal,
    totalHuman: `${(grandTotal / (1024 * 1024)).toFixed(2)} MB`,
    directories: usage,
  });
}

export async function cleanCache(_req: Request, res: Response) {
  const cacheDir = path.join(env.resolvedStoragePath, "cache");
  let deletedFiles = 0;
  try {
    const files = await fs.readdir(cacheDir);
    for (const f of files) {
      const p = path.join(cacheDir, f);
      await fs.unlink(p);
      deletedFiles++;
    }
  } catch {
    // directory may not exist
  }

  return sendSuccess(res, {
    message: "Cache cleaned successfully",
    deletedFiles,
  });
}
