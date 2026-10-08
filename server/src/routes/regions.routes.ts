import { Router } from "express";
import { listRegions, getRegionBySlug } from "../controllers/regions.controller.js";

const router = Router();
router.get("/", listRegions);
router.get("/:slug", getRegionBySlug);

export default router;
