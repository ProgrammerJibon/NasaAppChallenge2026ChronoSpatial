import { Router } from "express";
import { create, getById } from "../controllers/comparisons.controller.js";
import { validate } from "../middleware/validate.js";
import {
  createComparisonSchema,
  getComparisonParamsSchema,
} from "../schemas/comparison.schemas.js";

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

export default router;
