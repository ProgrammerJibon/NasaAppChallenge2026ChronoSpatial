import { z } from "zod";

export const createComparisonSchema = z.object({
  observationAId: z.string().min(1),
  observationBId: z.string().min(1),
});

export const getComparisonParamsSchema = z.object({
  id: z.string().min(1),
});
