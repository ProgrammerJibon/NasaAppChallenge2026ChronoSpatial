import { Router } from "express";
import { getBootstrap } from "../controllers/bootstrap.controller.js";

const router = Router();
router.get("/bootstrap", getBootstrap);

export default router;
