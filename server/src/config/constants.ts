export const APP_NAME = "SPHEREx Sky Change Explorer API";
export const API_VERSION = "v1";

export const DEFAULT_QUERY_RADIUS_DEG = 0.25;
export const MAX_QUERY_RADIUS_DEG = 1.0;

/**
 * SPHEREx collections published by the NASA/IPAC IRSA SIA2 service, as reported
 * by the service's own COLLECTION parameter options. The retired `spherex_qr2*`
 * collections were removed by IRSA and queries against them return no rows.
 */
export const IRSA_COLLECTIONS = [
  "spherex_qr3",
  "spherex_qr3_deep",
  "spherex_dr1",
  "spherex_dr1_deep",
  "spherex_dr1_cube",
] as const;

export type IrsaCollection = (typeof IRSA_COLLECTIONS)[number];

export const IRSA_SIA_PATH = "/SIA";
export const IRSA_HOST = "irsa.ipac.caltech.edu";

/** JPL Solar System Dynamics endpoints. None of them accept an API key. */
export const JPL_HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
export const JPL_SBDB_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api";
export const JPL_SB_IDENT_URL = "https://ssd-api.jpl.nasa.gov/sb_ident.api";
export const JPL_HOSTS = ["ssd.jpl.nasa.gov", "ssd-api.jpl.nasa.gov"] as const;

/** JPL-sourced NEO data served through api.nasa.gov; this one needs the key. */
export const NASA_NEOWS_URL = "https://api.nasa.gov/neo/rest/v1/neo";
export const NASA_API_HOST = "api.nasa.gov";

/** SPHEREx flies six linear-variable-filter detectors, D1..D6. */
export const SPHEREX_BAND_COUNT = 6;

/** SPHEREx detector plate scale in arcseconds per pixel. */
export const SPHEREX_PIXEL_SCALE_ARCSEC = 6.15;

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
  IDENTIFY_OBJECTS: "IDENTIFY_OBJECTS",
  PREPARE_DEMO: "PREPARE_DEMO",
} as const;

export const JOB_STATUSES = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
