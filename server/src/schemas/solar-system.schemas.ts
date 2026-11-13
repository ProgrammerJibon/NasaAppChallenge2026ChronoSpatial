import { z } from "zod";
import { MAX_FIELD_HALF_WIDTH_DEG } from "../services/jpl.service.js";

const isoDate = z
  .string()
  .min(4)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "must be an ISO-8601 date or date-time",
  });

export const identifySchema = z.object({
  ra: z.number().min(0).max(359.999999),
  dec: z.number().min(-90).max(90),
  halfWidthDeg: z.number().min(0.001).max(MAX_FIELD_HALF_WIDTH_DEG).default(0.1),
  obsTime: isoDate,
  vmagLimit: z.number().min(1).max(40).optional(),
  twoPass: z.boolean().default(true),
});

export const ephemerisSchema = z
  .object({
    target: z.string().trim().min(1).max(64),
    start: isoDate.optional(),
    stop: isoDate.optional(),
    step: z.string().trim().min(1).max(24).default("1 d"),
    epoch: isoDate.optional(),
    center: z.string().trim().min(1).max(32).default("500@399"),
  })
  .superRefine((value, context) => {
    if (!value.epoch && !(value.start && value.stop)) {
      context.addIssue({
        code: "custom",
        path: ["epoch"],
        message: "Provide either epoch, or both start and stop.",
      });
    }
  });

export const designationParamsSchema = z.object({
  designation: z.string().trim().min(1).max(64),
});

export const identifierParamsSchema = z.object({
  identifier: z.string().trim().regex(/^\d{1,12}$/, "must be a numeric SPK identifier"),
});

export const comparisonParamsSchema = z.object({
  comparisonId: z.string().trim().min(1).max(64),
});

export const identifyComparisonSchema = z.object({
  vmagLimit: z.number().min(1).max(40).optional(),
  toleranceArcsec: z.number().min(1).max(3600).optional(),
});
