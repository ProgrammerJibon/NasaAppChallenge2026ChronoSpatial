import { Router } from "express";
import {
  login,
  logout,
  getStatus,
  getJobs,
  retryJob,
  cancelJob,
  getStorageStatus,
  cleanCache,
} from "../controllers/admin.controller.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import {
  adminLoginSchema,
  adminJobParamsSchema,
} from "../schemas/admin.schemas.js";

const router = Router();

router.post("/login", validate({ body: adminLoginSchema }), login);
router.post("/logout", adminAuth, logout);
router.get("/status", adminAuth, getStatus);
router.get("/jobs", adminAuth, getJobs);
router.post(
  "/jobs/:id/retry",
  adminAuth,
  validate({ params: adminJobParamsSchema }),
  retryJob
);
router.post(
  "/jobs/:id/cancel",
  adminAuth,
  validate({ params: adminJobParamsSchema }),
  cancelJob
);
router.get("/storage", adminAuth, getStorageStatus);
router.post("/cache/cleanup", adminAuth, cleanCache);

export default router;
