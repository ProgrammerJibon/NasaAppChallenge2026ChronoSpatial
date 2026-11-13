import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { bootstrapDatabase } from "./db/bootstrap.js";
import { app } from "./app.js";
import { createDemoFallbackApp } from "./demo-fallback.js";

async function startServer() {
  try {
    logger.info("Initializing SPHEREx Sky Change Explorer API server...");

    // 1. Ensure database, migrations, and demo data
    let activeApp = app;
    try {
      await bootstrapDatabase();
    } catch (error) {
      if (env.NODE_ENV !== "development") throw error;
      const fallback = await createDemoFallbackApp();
      if (!fallback) throw error;
      activeApp = fallback;
      logger.warn("MySQL is unavailable. Serving bundled IRSA observations with SQLite-backed observation reviews.");
    }

    // 2. Start HTTP listener
    const server = activeApp.listen(env.PORT, env.HOST, () => {
      logger.info(
        `Server listening on http://${env.HOST}:${env.PORT} (env: ${env.NODE_ENV})`
      );
      logger.info(`Storage directory: ${env.resolvedStoragePath}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Only execute directly when run as main module
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  startServer();
}

export { startServer };
