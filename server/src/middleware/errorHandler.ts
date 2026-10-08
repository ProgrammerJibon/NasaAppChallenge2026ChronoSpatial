import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}:`, err);

  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message =
    err.message || "An unexpected error occurred. Please try again later.";

  return sendError(res, code, message, statusCode, err.details);
}
