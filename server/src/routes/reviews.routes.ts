import { Router } from "express";
import {
  getNext,
  submit,
  getStats,
} from "../controllers/reviews.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  submitReviewSchema,
  getReviewStatsParamsSchema,
} from "../schemas/review.schemas.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/next", getNext);

router.post(
  "/",
  rateLimit(env.RATE_LIMIT_REVIEW_PER_MINUTE, 60),
  validate({ body: submitReviewSchema }),
  submit
);

router.get(
  "/stats/:comparisonId",
  validate({ params: getReviewStatsParamsSchema }),
  getStats
);

export default router;
