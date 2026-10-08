import type { Request, Response } from "express";
import {
  createComparison,
  getComparisonById,
} from "../services/comparison.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function create(req: Request, res: Response) {
  const { observationAId, observationBId } = req.body;
  try {
    const result = await createComparison(observationAId, observationBId);
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    return sendError(res, "COMPARISON_FAILED", err.message || "Failed to compare epochs", 400);
  }
}

export async function getById(req: Request, res: Response) {
  const id = String(req.params.id);
  const comp = await getComparisonById(id);

  if (!comp) {
    return sendError(
      res,
      "COMPARISON_NOT_FOUND",
      `Comparison not found: ${id}`,
      404
    );
  }

  return sendSuccess(res, comp);
}
