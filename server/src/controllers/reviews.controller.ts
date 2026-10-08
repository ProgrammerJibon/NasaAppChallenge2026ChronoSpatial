import type { Request, Response } from "express";
import {
  getNextReviewItem,
  submitReview,
  getReviewStats,
} from "../services/review.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sha256 } from "../utils/hash.js";

export async function getNext(req: Request, res: Response) {
  const visitorHeader = req.headers["x-visitor-id"] || req.ip || "anonymous";
  const visitorHash = sha256(String(visitorHeader));

  const item = await getNextReviewItem(visitorHash);
  if (!item) {
    return sendError(
      res,
      "NO_REVIEW_ITEMS",
      "No candidates currently available for citizen science review.",
      404
    );
  }

  return sendSuccess(res, item);
}

export async function submit(req: Request, res: Response) {
  const { comparisonId, candidateId, visitorHash, classification, confidence } =
    req.body;

  const reviewId = await submitReview(
    comparisonId,
    candidateId ?? null,
    visitorHash,
    classification,
    confidence ?? 1.0
  );

  return sendSuccess(res, { reviewId, status: "recorded" }, 201);
}

export async function getStats(req: Request, res: Response) {
  const comparisonId = String(req.params.comparisonId);
  const stats = await getReviewStats(comparisonId);
  return sendSuccess(res, stats);
}
