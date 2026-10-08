import { Router } from "express";
import {
  search,
  list,
  getById,
} from "../controllers/observations.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  searchObservationsSchema,
  listObservationsSchema,
  getObservationParamsSchema,
} from "../schemas/observation.schemas.js";
import { env } from "../config/env.js";

const router = Router();

router.post(
  "/search",
  rateLimit(env.RATE_LIMIT_SEARCH_PER_MINUTE, 60),
  validate({ body: searchObservationsSchema }),
  search
);

router.get(
  "/",
  validate({ query: listObservationsSchema }),
  list
);

router.get(
  "/:id",
  validate({ params: getObservationParamsSchema }),
  getById
);

export default router;
