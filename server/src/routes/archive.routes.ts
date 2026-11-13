import { Router } from "express";
import { collections, cutout, search } from "../controllers/archive.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { archiveCutoutSchema, archiveSearchSchema } from "../schemas/archive.schemas.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/collections", collections);

router.post(
  "/search",
  rateLimit(env.RATE_LIMIT_ARCHIVE_PER_MINUTE, 60),
  validate({ body: archiveSearchSchema }),
  search
);

router.post(
  "/cutout-url",
  rateLimit(env.RATE_LIMIT_ARCHIVE_PER_MINUTE, 60),
  validate({ body: archiveCutoutSchema }),
  cutout
);

export default router;
