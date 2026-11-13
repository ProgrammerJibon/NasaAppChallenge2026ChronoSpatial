import type { Request, Response } from "express";
import {
  listMovingObjectMatches,
  requestIdentification,
} from "../services/moving-object.service.js";
import { getComparisonById } from "../services/comparison.service.js";
import { sendError, sendSuccess } from "../utils/response.js";

/** Stored NASA JPL identifications for a completed epoch comparison. */

export async function listForComparison(req: Request, res: Response) {
  const comparisonId = String(req.params.id);
  const comparison = await getComparisonById(comparisonId);
  if (!comparison) {
    return sendError(res, "COMPARISON_NOT_FOUND", `Comparison not found: ${comparisonId}`, 404);
  }

  const matches = await listMovingObjectMatches(comparisonId);
  return sendSuccess(res, {
    comparisonId,
    count: matches.length,
    matches,
    source: "NASA/JPL Small-Body Identification + Small-Body Database",
  });
}

export async function identifyForComparison(req: Request, res: Response) {
  const comparisonId = String(req.params.id);
  const comparison = await getComparisonById(comparisonId);
  if (!comparison) {
    return sendError(res, "COMPARISON_NOT_FOUND", `Comparison not found: ${comparisonId}`, 404);
  }
  if (comparison.status !== "completed") {
    return sendError(
      res,
      "COMPARISON_NOT_READY",
      `Comparison ${comparisonId} is ${comparison.status}; moving-object identification needs a completed difference image.`,
      409
    );
  }

  const result = await requestIdentification(comparisonId, {
    vmagLimit: req.body?.vmagLimit,
    toleranceArcsec: req.body?.toleranceArcsec,
  });

  return sendSuccess(res, { comparisonId, ...result }, result.status === "queued" ? 202 : 200);
}
