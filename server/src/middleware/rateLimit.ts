import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const clientMap = new Map<string, RateLimitRecord>();

// Cleanup stale clients periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of clientMap.entries()) {
    if (now > record.resetAt) {
      clientMap.delete(key);
    }
  }
}, 60000);

export function rateLimit(limit: number, windowSeconds = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = clientMap.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      clientMap.set(key, record);
    } else {
      record.count += 1;
    }

    if (record.count > limit) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return sendError(
        res,
        "RATE_LIMIT_EXCEEDED",
        `Too many requests. Please retry in ${retryAfterSec} seconds.`,
        429,
        { retryAfterSec }
      );
    }

    return next();
  };
}
