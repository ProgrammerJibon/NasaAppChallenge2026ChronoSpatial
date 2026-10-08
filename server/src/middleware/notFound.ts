import type { Request, Response } from "express";
import { sendError } from "../utils/response.js";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    "ENDPOINT_NOT_FOUND",
    `Cannot ${req.method} ${req.originalUrl}`,
    404
  );
}
