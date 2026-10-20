import { Router } from "express";
import { observationReviewSchema } from "../schemas/observation-review.schemas.js";
import { saveObservationReview, getOwnObservationReview, getObservationReviewStats } from "../services/observation-review.service.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";
import { sha256 } from "../utils/hash.js";
import { sendError, sendSuccess } from "../utils/response.js";

const router = Router();
function visitorHash(value: unknown) { return typeof value === "string" && value.length >= 8 && value.length <= 128 ? sha256(value) : null; }

router.post("/", rateLimit(env.RATE_LIMIT_REVIEW_PER_MINUTE, 60), async (req, res, next) => {
  try {
    const visitor = visitorHash(req.headers["x-visitor-id"]);
    if (!visitor) return sendError(res, "VISITOR_REQUIRED", "A browser review identifier is required.", 400);
    const parsed = observationReviewSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, "INVALID_REVIEW", "Check the review fields and try again.", 400);
    const review = await saveObservationReview(parsed.data, visitor);
    return review ? sendSuccess(res, review, 201) : sendError(res, "OBSERVATION_NOT_FOUND", "Observation not found.", 404);
  } catch (error) { next(error); }
});

router.get("/:observationId/mine", async (req, res, next) => {
  try {
    const visitor = visitorHash(req.headers["x-visitor-id"]);
    if (!visitor) return sendError(res, "VISITOR_REQUIRED", "A browser review identifier is required.", 400);
    return sendSuccess(res, await getOwnObservationReview(String(req.params.observationId), visitor));
  } catch (error) { next(error); }
});

router.get("/:observationId/stats", async (req, res, next) => {
  try { return sendSuccess(res, await getObservationReviewStats(String(req.params.observationId))); }
  catch (error) { next(error); }
});

export default router;
