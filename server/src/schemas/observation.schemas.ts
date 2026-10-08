import { z } from "zod";

export const searchObservationsSchema = z.object({
  ra: z.number().min(0).max(360),
  dec: z.number().min(-90).max(90),
  radiusDeg: z.number().min(0.001).max(1.0).default(0.25),
  band: z.number().int().min(1).max(6).nullable().optional(),
});

export const listObservationsSchema = z.object({
  regionId: z.string().optional(),
  band: z.coerce.number().int().min(1).max(6).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getObservationParamsSchema = z.object({
  id: z.string().min(1),
});
