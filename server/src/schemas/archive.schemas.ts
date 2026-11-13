import { z } from "zod";
import { IRSA_COLLECTIONS, SPHEREX_BAND_COUNT } from "../config/constants.js";

export const archiveSearchSchema = z.object({
  ra: z.number().min(0).max(359.999999),
  dec: z.number().min(-90).max(90),
  radiusDeg: z.number().min(0.001).max(1.0).default(0.25),
  collection: z.enum(IRSA_COLLECTIONS).optional(),
  band: z.number().int().min(1).max(SPHEREX_BAND_COUNT).nullable().optional(),
  limit: z.number().int().min(1).max(500).default(50),
});

export const archiveCutoutSchema = z.object({
  accessUrl: z.string().url(),
  ra: z.number().min(0).max(359.999999),
  dec: z.number().min(-90).max(90),
  sizeDeg: z.number().min(0.001).max(0.5).default(0.12),
});
