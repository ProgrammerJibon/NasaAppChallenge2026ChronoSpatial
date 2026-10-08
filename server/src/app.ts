import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import bootstrapRoutes from "./routes/bootstrap.routes.js";
import regionsRoutes from "./routes/regions.routes.js";
import observationsRoutes from "./routes/observations.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import comparisonsRoutes from "./routes/comparisons.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import filesRoutes from "./routes/files.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";

export function createApp() {
  const app = express();

  // Security headers: allow images to be loaded by frontend
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : [env.CORS_ORIGIN, "http://localhost:3000"],
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: "2mb" }));

  // API router
  const apiRouter = express.Router();

  apiRouter.use("/", healthRoutes);
  apiRouter.use("/", bootstrapRoutes);
  apiRouter.use("/regions", regionsRoutes);
  apiRouter.use("/observations", observationsRoutes);
  apiRouter.use("/jobs", jobsRoutes);
  apiRouter.use("/comparisons", comparisonsRoutes);
  apiRouter.use("/reviews", reviewsRoutes);
  apiRouter.use("/review", reviewsRoutes); // Supports /api/review/next
  apiRouter.use("/files", filesRoutes);
  apiRouter.use("/admin", adminRoutes);

  app.use("/api", apiRouter);

  // 404 & Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
