import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("spherex_atlas"),

  STORAGE_PATH: z.string().default("../storage"),
  CONTENT_PATH: z.string().default("../content"),

  ADMIN_PASSWORD: z.string().default("spherex_admin_secret_2025"),
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().default(24),
  RATE_LIMIT_SEARCH_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_REVIEW_PER_MINUTE: z.coerce.number().default(120),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  resolvedStoragePath: path.resolve(process.cwd(), parsed.data.STORAGE_PATH),
  resolvedContentPath: path.resolve(process.cwd(), parsed.data.CONTENT_PATH),
};
