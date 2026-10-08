import { Router } from "express";
import {
  getPreview,
  getComparisonFile,
} from "../controllers/files.controller.js";

const router = Router();

router.get("/preview/:observationId", getPreview);
router.get("/comparison/:comparisonId/:kind", getComparisonFile);

export default router;
