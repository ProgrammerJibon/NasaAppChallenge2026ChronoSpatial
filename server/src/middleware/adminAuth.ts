import type { Request, Response, NextFunction } from "express";
import { query } from "../db/connection.js";
import { hashToken } from "../utils/hash.js";
import { sendError } from "../utils/response.js";
import type { AdminSessionRow } from "../types/index.js";

export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers["x-admin-token"];

  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (typeof tokenHeader === "string") {
    token = tokenHeader.trim();
  }

  if (!token) {
    return sendError(
      res,
      "UNAUTHORIZED",
      "Admin authentication token is required.",
      401
    );
  }

  const tokenHash = hashToken(token);
  const [session] = await query<AdminSessionRow>(
    "SELECT * FROM admin_sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP(3)",
    [tokenHash]
  );

  if (!session) {
    return sendError(
      res,
      "INVALID_TOKEN",
      "Admin session has expired or is invalid.",
      401
    );
  }

  return next();
}
