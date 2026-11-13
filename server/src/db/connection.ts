import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      // Every DATETIME column in this schema holds UTC: the API writes
      // UTC_TIMESTAMP(3) and the Python worker writes naive UTC. Without this,
      // mysql2 would read those values as the host's local time and shift every
      // observation epoch by the machine's UTC offset.
      timezone: "Z",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

/**
 * Columns the schema stores as JSON documents.
 *
 * MariaDB implements JSON as an alias for LONGTEXT and reports it over the wire
 * as a BLOB, so the driver cannot tell JSON from text and hands these back as
 * strings. MySQL 8 returns parsed values for the same columns. Normalising here
 * means every caller — and the API's clients — see parsed objects on both.
 */
const JSON_COLUMNS = new Set([
  "metadata_json",
  "summary_json",
  "payload_json",
  "result_json",
  "flags_json",
  "orbit_json",
]);

function parseJsonColumns<T>(rows: T[]): T[] {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const column of JSON_COLUMNS) {
      const value = (row as Record<string, unknown>)[column];
      if (typeof value !== "string") continue;
      try {
        (row as Record<string, unknown>)[column] = JSON.parse(value);
      } catch {
        // A column holding something other than JSON is left exactly as it is.
      }
    }
  }
  return rows;
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.query(sql, params);
  // Writes routed through query() return a result header rather than rows.
  return Array.isArray(rows) ? parseJsonColumns(rows as T[]) : (rows as unknown as T[]);
}

export async function execute<T = mysql.ResultSetHeader>(
  sql: string,
  params?: any[]
): Promise<T> {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return result as T;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed.");
  }
}
