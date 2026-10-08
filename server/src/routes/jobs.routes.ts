import { Router } from "express";
import { getJob } from "../controllers/jobs.controller.js";

const router = Router();
router.get("/:id", getJob);

export default router;
