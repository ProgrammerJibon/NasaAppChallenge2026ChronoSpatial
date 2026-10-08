export const APP_NAME = "SPHEREx Sky Change Explorer API";
export const API_VERSION = "v1";

export const DEFAULT_QUERY_RADIUS_DEG = 0.25;
export const MAX_QUERY_RADIUS_DEG = 1.0;

export const IRSA_COLLECTIONS = [
  "spherex_qr3",
  "spherex_qr3_deep",
  "spherex_qr2",
  "spherex_qr2_deep",
] as const;

export const COMPARISON_KINDS = [
  "aligned-a",
  "aligned-b",
  "difference",
  "significance",
] as const;

export type ComparisonKind = (typeof COMPARISON_KINDS)[number];

export const JOB_TYPES = {
  FETCH_OBSERVATIONS: "FETCH_OBSERVATIONS",
  COMPARE_EPOCHS: "COMPARE_EPOCHS",
  PREPARE_DEMO: "PREPARE_DEMO",
} as const;

export const JOB_STATUSES = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
