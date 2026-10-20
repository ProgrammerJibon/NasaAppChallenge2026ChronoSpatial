import { z } from "zod";

export const observationReviewSchema = z.object({
  observationId: z.string().min(1).max(64),
  classification: z.enum(["clear", "faint", "artifact", "uncertain"]),
  confidence: z.number().min(.1).max(1),
  flags: z.array(z.enum(["noise", "saturation", "edge", "structured-background"])).max(4).default([]),
  note: z.string().trim().max(1000).default(""),
});

export type ObservationReviewInput = z.infer<typeof observationReviewSchema>;
