import type { Request, Response } from "express";
import { getJobById } from "../services/job.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function getJob(req: Request, res: Response) {
  const id = String(req.params.id);
  const job = await getJobById(id);

  if (!job) {
    return sendError(res, "JOB_NOT_FOUND", `Processing job not found: ${id}`, 404);
  }

  return sendSuccess(res, {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    attempts: job.attempts,
    result: job.result_json,
    error: job.error,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
  });
}
