import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getPool } from "./connection.js";
import { runMigrations } from "./migrate.js";
import { seedDemoDataIfNeeded } from "../services/demo.service.js";

export async function bootstrapDatabase(): Promise<void> {
  logger.info(`Checking database: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}...`);

  // 1. Connect without database selected to ensure database exists
  let initConn: mysql.Connection | null = null;
  try {
    initConn = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    });

    await initConn.query(`
      CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
    `);

    logger.info(`Database \`${env.DB_NAME}\` is ensured.`);
  } catch (err) {
    logger.error("Failed to connect to MySQL to verify database:", err);
    throw new Error(
      `Database connection failed. Ensure MySQL is running on ${env.DB_HOST}:${env.DB_PORT}. Details: ${(err as Error).message}`
    );
  } finally {
    if (initConn) {
      await initConn.end();
    }
  }

  // 2. Connect pool to the database
  const pool = getPool();
  try {
    const conn = await pool.getConnection();
    conn.release();
    logger.info("Application connection pool established.");
  } catch (err) {
    logger.error("Failed to acquire connection from pool:", err);
    throw err;
  }

  // 3. Run migrations
  await runMigrations();

  // 4. Seed demo data
  await seedDemoDataIfNeeded();

  logger.info("Database bootstrap completed successfully.");
}
