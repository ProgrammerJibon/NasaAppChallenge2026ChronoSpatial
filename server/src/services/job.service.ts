import { query, execute } from "../db/connection.js";
import { generateId } from "../utils/hash.js";
import type { ProcessingJobRow } from "../types/index.js";

export async function createJob(
  type: string,
  payload: Record<string, unknown>,
  priority = 0
): Promise<string> {
  const id = generateId("job");
  await execute(
    `INSERT INTO processing_jobs (
      id, type, status, priority, payload_json, progress, attempts, created_at
    ) VALUES (?, ?, 'queued', ?, ?, 0.0, 0, UTC_TIMESTAMP(3))`,
    [id, type, priority, JSON.stringify(payload)]
  );
  return id;
}

export async function getJobById(id: string): Promise<ProcessingJobRow | null> {
  const [job] = await query<ProcessingJobRow>(
    "SELECT * FROM processing_jobs WHERE id = ?",
    [id]
  );
  return job || null;
}

export async function listJobs(
  limit = 50,
  offset = 0,
  status?: string
): Promise<{ jobs: ProcessingJobRow[]; total: number }> {
  let sql = "SELECT * FROM processing_jobs";
  const params: any[] = [];

  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const jobs = await query<ProcessingJobRow>(sql, params);

  const countSql = status
    ? "SELECT COUNT(*) as count FROM processing_jobs WHERE status = ?"
    : "SELECT COUNT(*) as count FROM processing_jobs";
  const countParams = status ? [status] : [];
  const [countRow] = await query<any>(countSql, countParams);

  return {
    jobs,
    total: Number(countRow?.count || 0),
  };
}

export async function retryJob(id: string): Promise<boolean> {
  const result = await execute(
    `UPDATE processing_jobs
     SET status = 'queued', progress = 0.0, error = NULL, started_at = NULL, completed_at = NULL
     WHERE id = ? AND status IN ('failed', 'cancelled')`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function cancelJob(id: string): Promise<boolean> {
  const result = await execute(
    `UPDATE processing_jobs
     SET status = 'cancelled', completed_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND status IN ('queued', 'processing')`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function getWorkerStatus(): Promise<"active" | "idle" | "offline"> {
  // Check if a job had a heartbeat or completion in the last 5 minutes
  const [activeRow] = await query<any>(
    `SELECT COUNT(*) as count FROM processing_jobs
     WHERE (
       (status = 'processing' AND heartbeat_at > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 MINUTE))
       OR (completed_at > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 5 MINUTE))
     )`
  );
  if (Number(activeRow?.count || 0) > 0) {
    return "active";
  }

  // Check if any job exists at all
  const [anyJobRow] = await query<any>("SELECT COUNT(*) as count FROM processing_jobs");
  if (Number(anyJobRow?.count || 0) > 0) {
    return "idle";
  }

  return "offline";
}
