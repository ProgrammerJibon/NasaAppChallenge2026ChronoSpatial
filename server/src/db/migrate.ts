import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./connection.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  
  // Create migration tracking table if not exists
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [appliedRows] = await pool.query<any[]>(
    "SELECT version FROM schema_migrations"
  );
  const applied = new Set((appliedRows || []).map((r: any) => r.version));

  const migrationsDir = path.join(__dirname, "migrations");
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    if (applied.has(file)) continue;

    logger.info(`Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = await fs.readFile(filePath, "utf-8");

    // Split statements safely by semicolon while respecting strings
    const statements = sqlContent
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.execute(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [file]
      );
      await connection.commit();
      logger.info(`Migration ${file} applied successfully.`);
    } catch (err) {
      await connection.rollback();
      logger.error(`Migration ${file} failed:`, err);
      throw err;
    } finally {
      connection.release();
    }
  }
}
