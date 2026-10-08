import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";

export function getHealth(_req: Request, res: Response) {
  return sendSuccess(res, {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
