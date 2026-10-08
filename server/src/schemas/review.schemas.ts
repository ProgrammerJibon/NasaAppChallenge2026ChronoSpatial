import { z } from "zod";

export const submitReviewSchema = z.object({
  comparisonId: z.string().min(1),
  candidateId: z.string().nullable().optional(),
  visitorHash: z.string().min(1).max(64),
  classification: z.enum([
    "Moving object",
    "Brightness changed",
    "Appeared/disappeared",
    "Likely artefact/noise",
    "Unsure",
  ]),
  confidence: z.number().min(0.1).max(1.0).default(1.0),
});

export const getReviewStatsParamsSchema = z.object({
  comparisonId: z.string().min(1),
});
