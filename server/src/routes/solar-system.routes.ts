import { Router } from "express";
import {
  ephemeris,
  identify,
  nearEarthObject,
  smallBody,
} from "../controllers/solar-system.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  designationParamsSchema,
  ephemerisSchema,
  identifierParamsSchema,
  identifySchema,
} from "../schemas/solar-system.schemas.js";
import { env } from "../config/env.js";

const router = Router();
const limit = rateLimit(env.RATE_LIMIT_SOLAR_SYSTEM_PER_MINUTE, 60);

router.post("/identify", limit, validate({ body: identifySchema }), identify);
router.get("/ephemeris", limit, validate({ query: ephemerisSchema }), ephemeris);
router.get("/neo/:identifier", limit, validate({ params: identifierParamsSchema }), nearEarthObject);
router.get("/objects/:designation", limit, validate({ params: designationParamsSchema }), smallBody);

export default router;
