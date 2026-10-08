import { query, execute } from "../db/connection.js";
import { generateId } from "../utils/hash.js";
import { getComparisonById } from "./comparison.service.js";
import type { ReviewRow, ChangeCandidateRow } from "../types/index.js";

export interface ReviewItem {
  comparisonId: string;
  candidateId: string | null;
  candidate: ChangeCandidateRow | null;
  comparison: any;
}

export async function getNextReviewItem(
  visitorHash: string
): Promise<ReviewItem | null> {
  // Find a candidate that has not been voted on by this visitor
  const unvotedCandidates = await query<any>(
    `SELECT c.*, comp.id as comp_id
     FROM change_candidates c
     JOIN comparisons comp ON c.comparison_id = comp.id
     LEFT JOIN reviews r ON r.candidate_id = c.id AND r.visitor_hash = ?
     WHERE comp.status = 'completed' AND r.id IS NULL
     ORDER BY c.score DESC
     LIMIT 1`,
    [visitorHash]
  );

  if (unvotedCandidates.length > 0) {
    const cand = unvotedCandidates[0];
    const comp = await getComparisonById(cand.comp_id);
    return {
      comparisonId: cand.comp_id,
      candidateId: cand.id,
      candidate: cand,
      comparison: comp,
    };
  }

  // Fallback: pick any completed comparison with candidates
  const fallbackCandidates = await query<any>(
    `SELECT c.*, comp.id as comp_id
     FROM change_candidates c
     JOIN comparisons comp ON c.comparison_id = comp.id
     WHERE comp.status = 'completed'
     ORDER BY c.created_at DESC
     LIMIT 1`
  );

  if (fallbackCandidates.length > 0) {
    const cand = fallbackCandidates[0];
    const comp = await getComparisonById(cand.comp_id);
    return {
      comparisonId: cand.comp_id,
      candidateId: cand.id,
      candidate: cand,
      comparison: comp,
    };
  }

  return null;
}

export async function submitReview(
  comparisonId: string,
  candidateId: string | null,
  visitorHash: string,
  classification: string,
  confidence: number
): Promise<string> {
  const id = generateId("rev");
  await execute(
    `INSERT INTO reviews (
      id, comparison_id, candidate_id, visitor_hash, classification, confidence, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
    [id, comparisonId, candidateId, visitorHash, classification, confidence]
  );
  return id;
}

export async function getReviewStats(comparisonId: string): Promise<{
  totalReviews: number;
  classifications: Record<string, number>;
  averageConfidence: number;
}> {
  const reviews = await query<ReviewRow>(
    "SELECT * FROM reviews WHERE comparison_id = ?",
    [comparisonId]
  );

  const totalReviews = reviews.length;
  const classifications: Record<string, number> = {};
  let totalConfidence = 0;

  for (const r of reviews) {
    classifications[r.classification] =
      (classifications[r.classification] || 0) + 1;
    totalConfidence += r.confidence;
  }

  return {
    totalReviews,
    classifications,
    averageConfidence:
      totalReviews > 0 ? Number((totalConfidence / totalReviews).toFixed(2)) : 1.0,
  };
}
