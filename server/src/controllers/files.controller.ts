import type { Request, Response } from "express";
import {
  getPreviewFilePath,
  getComparisonFilePath,
} from "../services/file.service.js";
import { type ComparisonKind } from "../config/constants.js";
import { sendError } from "../utils/response.js";

export async function getPreview(req: Request, res: Response) {
  const observationId = String(req.params.observationId);
  const filePath = await getPreviewFilePath(observationId);

  if (!filePath) {
    return sendError(
      res,
      "FILE_NOT_FOUND",
      `Preview image not found for observation: ${observationId}`,
      404
    );
  }

  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.sendFile(filePath);
}

export async function getComparisonFile(req: Request, res: Response) {
  const comparisonId = String(req.params.comparisonId);
  const kind = String(req.params.kind);
  const filePath = await getComparisonFilePath(
    comparisonId,
    kind as ComparisonKind
  );

  if (!filePath) {
    return sendError(
      res,
      "FILE_NOT_FOUND",
      `Comparison file not found for kind: ${kind} (${comparisonId})`,
      404
    );
  }

  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.sendFile(filePath);
}
