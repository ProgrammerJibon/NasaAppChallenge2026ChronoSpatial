import { Router } from "express";
import { create, getById } from "../controllers/comparisons.controller.js";
import {
  identifyForComparison,
  listForComparison,
} from "../controllers/moving-objects.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  createComparisonSchema,
  getComparisonParamsSchema,
} from "../schemas/comparison.schemas.js";
import { identifyComparisonSchema } from "../schemas/solar-system.schemas.js";
import { env } from "../config/env.js";

const router = Router();

router.post(
  "/",
  validate({ body: createComparisonSchema }),
  create
);

router.get(
  "/:id",
  validate({ params: getComparisonParamsSchema }),
  getById
);

router.get(
  "/:id/moving-objects",
  validate({ params: getComparisonParamsSchema }),
  listForComparison
);

router.post(
  "/:id/identify",
  rateLimit(env.RATE_LIMIT_SOLAR_SYSTEM_PER_MINUTE, 60),
  validate({ params: getComparisonParamsSchema, body: identifyComparisonSchema }),
  identifyForComparison
);

export default router;
