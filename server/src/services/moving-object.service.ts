import { query } from "../db/connection.js";
import { createJob } from "./job.service.js";
import { JOB_TYPES } from "../config/constants.js";
import type { MovingObjectMatchRow } from "../types/index.js";

/**
 * Read access to the JPL identifications the Python worker stores for a
 * comparison, plus the ability to queue a fresh identification pass.
 */

export interface MovingObjectMatch {
  id: string;
  comparisonId: string;
  candidateId: string | null;
  objectName: string;
  designation: string | null;
  ra: number;
  dec: number;
  separationArcsec: number;
  offsetArcsec: number | null;
  apparentMagnitude: number | null;
  raRateArcsecPerHour: number | null;
  decRateArcsecPerHour: number | null;
  motionArcsecPerHour: number | null;
  epochUtc: string;
  source: string;
  orbit: Record<string, unknown> | null;
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toMatch(row: MovingObjectMatchRow): MovingObjectMatch {
  return {
    id: row.id,
    comparisonId: row.comparison_id,
    candidateId: row.candidate_id,
    objectName: row.object_name,
    designation: row.object_designation,
    ra: Number(row.ra),
    dec: Number(row.dec),
    separationArcsec: Number(row.separation_arcsec),
    offsetArcsec: row.offset_arcsec === null ? null : Number(row.offset_arcsec),
    apparentMagnitude: row.apparent_magnitude === null ? null : Number(row.apparent_magnitude),
    raRateArcsecPerHour:
      row.ra_rate_arcsec_per_hour === null ? null : Number(row.ra_rate_arcsec_per_hour),
    decRateArcsecPerHour:
      row.dec_rate_arcsec_per_hour === null ? null : Number(row.dec_rate_arcsec_per_hour),
    motionArcsecPerHour:
      row.motion_arcsec_per_hour === null ? null : Number(row.motion_arcsec_per_hour),
    epochUtc: row.epoch_utc instanceof Date ? row.epoch_utc.toISOString() : String(row.epoch_utc),
    source: row.source,
    orbit: parseJson(row.orbit_json),
  };
}

export async function listMovingObjectMatches(comparisonId: string): Promise<MovingObjectMatch[]> {
  const rows = await query<MovingObjectMatchRow>(
    "SELECT * FROM moving_object_matches WHERE comparison_id = ? ORDER BY separation_arcsec ASC",
    [comparisonId]
  );
  return rows.map(toMatch);
}

export async function listMovingObjectMatchesForCandidates(
  candidateIds: string[]
): Promise<Map<string, MovingObjectMatch[]>> {
  const grouped = new Map<string, MovingObjectMatch[]>();
  if (candidateIds.length === 0) return grouped;

  const placeholders = candidateIds.map(() => "?").join(", ");
  const rows = await query<MovingObjectMatchRow>(
    `SELECT * FROM moving_object_matches WHERE candidate_id IN (${placeholders}) ORDER BY separation_arcsec ASC`,
    candidateIds
  );

  for (const row of rows) {
    if (!row.candidate_id) continue;
    const existing = grouped.get(row.candidate_id) ?? [];
    existing.push(toMatch(row));
    grouped.set(row.candidate_id, existing);
  }
  return grouped;
}

/** Queue an IDENTIFY_OBJECTS job, reusing one that is already pending. */
export async function requestIdentification(
  comparisonId: string,
  options: { vmagLimit?: number; toleranceArcsec?: number } = {}
): Promise<{ jobId: string; status: "queued" | "already-queued" }> {
  const [active] = await query<{ id: string }>(
    `SELECT id FROM processing_jobs
     WHERE type = ? AND status IN ('queued', 'processing')
       AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.comparisonId')) = ?`,
    [JOB_TYPES.IDENTIFY_OBJECTS, comparisonId]
  );
  if (active) {
    return { jobId: active.id, status: "already-queued" };
  }

  const jobId = await createJob(
    JOB_TYPES.IDENTIFY_OBJECTS,
    {
      comparisonId,
      ...(options.vmagLimit !== undefined ? { vmagLimit: options.vmagLimit } : {}),
      ...(options.toleranceArcsec !== undefined ? { toleranceArcsec: options.toleranceArcsec } : {}),
    },
    1
  );
  return { jobId, status: "queued" };
}
