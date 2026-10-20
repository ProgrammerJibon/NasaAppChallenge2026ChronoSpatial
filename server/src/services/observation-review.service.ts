import { execute, query } from "../db/connection.js";
import { generateId } from "../utils/hash.js";
import type { ObservationReviewInput } from "../schemas/observation-review.schemas.js";

type StoredReview = ObservationReviewInput & { id: string; createdAt: string; updatedAt: string };

export async function saveObservationReview(input: ObservationReviewInput, visitorHash: string) {
  const observation = await query<{ id: string }>("SELECT id FROM observations WHERE id = ? LIMIT 1", [input.observationId]);
  if (!observation.length) return null;
  const id = generateId("orev");
  await execute(`INSERT INTO observation_reviews
    (id, observation_id, visitor_hash, classification, confidence, flags_json, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE classification = VALUES(classification), confidence = VALUES(confidence),
      flags_json = VALUES(flags_json), note = VALUES(note), updated_at = UTC_TIMESTAMP(3)`,
    [id, input.observationId, visitorHash, input.classification, input.confidence, JSON.stringify(input.flags), input.note]);
  return getOwnObservationReview(input.observationId, visitorHash);
}

export async function getOwnObservationReview(observationId: string, visitorHash: string): Promise<StoredReview | null> {
  const rows = await query<any>(`SELECT id, observation_id, classification, confidence, flags_json, note, created_at, updated_at
    FROM observation_reviews WHERE observation_id = ? AND visitor_hash = ? LIMIT 1`, [observationId, visitorHash]);
  if (!rows.length) return null;
  const row = rows[0];
  return { id: row.id, observationId: row.observation_id, classification: row.classification,
    confidence: Number(row.confidence), flags: typeof row.flags_json === "string" ? JSON.parse(row.flags_json) : row.flags_json,
    note: row.note, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}

export async function getObservationReviewStats(observationId: string) {
  const rows = await query<{ classification: string; count: number }>(`SELECT classification, COUNT(*) AS count
    FROM observation_reviews WHERE observation_id = ? GROUP BY classification`, [observationId]);
  const classifications = Object.fromEntries(rows.map(row => [row.classification, Number(row.count)]));
  return { totalReviews: Object.values(classifications).reduce((sum, count) => sum + count, 0), classifications };
}
