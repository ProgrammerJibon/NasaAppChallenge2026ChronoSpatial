import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject } from "zod";
import { sendError } from "../utils/response.js";

interface ValidationOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(options: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (options.body) {
        req.body = await options.body.parseAsync(req.body);
      }
      if (options.query) {
        req.query = await options.query.parseAsync(req.query);
      }
      if (options.params) {
        req.params = await options.params.parseAsync(req.params);
      }
      return next();
    } catch (error: any) {
      if (error.errors) {
        const issues = error.errors.map((e: any) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return sendError(
          res,
          "VALIDATION_ERROR",
          issues.map((i: any) => `${i.path}: ${i.message}`).join("; ") || "Invalid input data",
          400,
          issues
        );
      }
      return sendError(res, "VALIDATION_ERROR", "Invalid input data", 400);
    }
  };
}
