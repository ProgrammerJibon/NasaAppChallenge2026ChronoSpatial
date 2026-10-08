import type { Response } from "express";

export interface ApiResponseSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiResponseError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    ok: true,
    data,
  } satisfies ApiResponseSuccess<T>);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): Response {
  return res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  } satisfies ApiResponseError);
}
