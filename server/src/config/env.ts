import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Server-specific configuration first, then the repository-root .env, which
// holds the shared api.nasa.gov credential. `override: false` is the default,
// so nothing already set by the environment or server/.env is replaced and the
// root file is never rewritten.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

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

  // NASA data integrations. IRSA and the JPL Solar System Dynamics APIs are
  // open and need no credential; NASA_API_KEY is only sent to api.nasa.gov.
  NASA_API_KEY: z.string().trim().default(""),
  IRSA_BASE_URL: z.string().url().default("https://irsa.ipac.caltech.edu"),
  IRSA_COLLECTION: z.string().default("spherex_qr3"),
  IRSA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  IRSA_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(86_400),

  JPL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(300_000),
  JPL_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(604_800),
  JPL_OBSERVER_CODE: z.string().default("500"),
  JPL_VMAG_LIMIT: z.coerce.number().min(1).max(40).default(22),
  JPL_MATCH_TOLERANCE_ARCSEC: z.coerce.number().min(1).max(3600).default(60),

  RATE_LIMIT_ARCHIVE_PER_MINUTE: z.coerce.number().default(20),
  RATE_LIMIT_SOLAR_SYSTEM_PER_MINUTE: z.coerce.number().default(20),
}).superRefine((config, context) => {
  if (config.NODE_ENV === "production" && (
    config.ADMIN_PASSWORD.length < 16 ||
    ["spherex_admin_secret_2025", "spherex_admin_2026!", "change-me-before-publishing"].includes(config.ADMIN_PASSWORD)
  )) {
    context.addIssue({
      code: "custom",
      path: ["ADMIN_PASSWORD"],
      message: "Set a unique admin password of at least 16 characters before starting in production.",
    });
  }

  if (config.NASA_API_KEY && config.NASA_API_KEY.length < 8) {
    context.addIssue({
      code: "custom",
      path: ["NASA_API_KEY"],
      message: "NASA_API_KEY looks truncated. Use the key issued by https://api.nasa.gov, or leave it empty.",
    });
  }
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
  /** True when api.nasa.gov requests can be made. The key itself is never exported. */
  hasNasaApiKey: parsed.data.NASA_API_KEY.length > 0,
};
