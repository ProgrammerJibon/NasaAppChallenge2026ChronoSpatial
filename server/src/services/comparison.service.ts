import { query, execute } from "../db/connection.js";
import { generateId } from "../utils/hash.js";
import { getObservationById } from "./observation.service.js";
import { createJob } from "./job.service.js";
import { JOB_TYPES } from "../config/constants.js";
import type { ComparisonRow, ObservationRow, ChangeCandidateRow } from "../types/index.js";

export interface ComparisonWithDetails extends ComparisonRow {
  observationA?: ObservationRow;
  observationB?: ObservationRow;
  candidates?: ChangeCandidateRow[];
}

export async function getComparisonById(
  id: string
): Promise<ComparisonWithDetails | null> {
  const [comp] = await query<ComparisonRow>(
    "SELECT * FROM comparisons WHERE id = ?",
    [id]
  );
  if (!comp) return null;

  const obsA = await getObservationById(comp.observation_a_id);
  const obsB = await getObservationById(comp.observation_b_id);
  const candidates = await query<ChangeCandidateRow>(
    "SELECT * FROM change_candidates WHERE comparison_id = ? ORDER BY score DESC",
    [id]
  );

  return {
    ...comp,
    observationA: obsA || undefined,
    observationB: obsB || undefined,
    candidates,
  };
}

export async function createComparison(
  observationAId: string,
  observationBId: string
): Promise<
  | { status: "completed"; comparison: ComparisonWithDetails }
  | { status: "queued"; jobId: string; comparisonId: string }
> {
  if (observationAId === observationBId) {
    throw new Error("Cannot compare an observation with itself.");
  }

  const [obsA, obsB] = await Promise.all([
    getObservationById(observationAId),
    getObservationById(observationBId),
  ]);

  if (!obsA) {
    throw new Error(`Observation A not found: ${observationAId}`);
  }
  if (!obsB) {
    throw new Error(`Observation B not found: ${observationBId}`);
  }

  // Check if comparison already exists
  const [existing] = await query<ComparisonRow>(
    `SELECT * FROM comparisons
     WHERE (observation_a_id = ? AND observation_b_id = ?)
        OR (observation_a_id = ? AND observation_b_id = ?)`,
    [observationAId, observationBId, observationBId, observationAId]
  );

  if (existing && existing.status === "completed") {
    const details = await getComparisonById(existing.id);
    if (details) {
      return {
        status: "completed",
        comparison: details,
      };
    }
  }

  const comparisonId = existing ? existing.id : generateId("comp");

  if (!existing) {
    await execute(
      `INSERT INTO comparisons (
        id, observation_a_id, observation_b_id, status, created_at
      ) VALUES (?, ?, ?, 'queued', UTC_TIMESTAMP(3))`,
      [comparisonId, observationAId, observationBId]
    );
  }

  // Queue COMPARE_EPOCHS job
  const jobId = await createJob(
    JOB_TYPES.COMPARE_EPOCHS,
    {
      comparisonId,
      observationAId,
      observationBId,
      fitsA: obsA.fits_path,
      fitsB: obsB.fits_path,
    },
    2 // higher priority for comparison
  );

  return {
    status: "queued",
    jobId,
    comparisonId,
  };
}

export async function listComparisons(
  limit = 20,
  offset = 0
): Promise<{ comparisons: ComparisonRow[]; total: number }> {
  const comparisons = await query<ComparisonRow>(
    "SELECT * FROM comparisons ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  const [countRow] = await query<any>(
    "SELECT COUNT(*) as count FROM comparisons"
  );
  return {
    comparisons,
    total: Number(countRow?.count || 0),
  };
}
