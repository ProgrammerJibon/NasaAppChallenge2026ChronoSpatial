import { z } from "zod";

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export const adminJobParamsSchema = z.object({
  id: z.string().min(1),
});
