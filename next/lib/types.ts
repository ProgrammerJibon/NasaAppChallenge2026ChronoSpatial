export interface SkyRegion {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ra: number;
  dec: number;
  radius_deg: number;
  is_featured: boolean;
  created_at?: string;
  highlight?: string;
}

export interface Observation {
  id: string;
  archive_id: string;
  region_id: string | null;
  observation_date: string;
  ra: number;
  dec: number;
  band_number: number;
  wavelength_min_um: number;
  wavelength_max_um: number;
  archive_url: string | null;
  fits_path: string | null;
  preview_path: string | null;
  width: number;
  height: number;
  status: string;
  metadata_json: {
    detector?: number;
    obsid?: string;
    unit?: string;
    wcs?: {
      crval1: number;
      crval2: number;
      cdelt1: number;
      cdelt2: number;
      ctype1: string;
      ctype2: string;
    };
    [key: string]: unknown;
  } | null;
}

export interface SolarSystemIdentification {
  object_name: string;
  designation: string;
  separation_arcsec: number;
  apparent_magnitude?: number | null;
  motion_arcsec_per_hour?: number | null;
  orbit_class?: string | null;
  neo?: boolean | null;
  source: string;
}

/** A NASA JPL small body matched onto a detected change candidate. */
export interface MovingObjectMatch {
  id: string;
  comparisonId: string;
  candidateId: string | null;
  objectName: string;
  designation: string | null;
  ra: number;
  dec: number;
  separationArcsec: number;
  offsetArcsec: number | null;
  apparentMagnitude: number | null;
  raRateArcsecPerHour: number | null;
  decRateArcsecPerHour: number | null;
  motionArcsecPerHour: number | null;
  epochUtc: string;
  source: string;
  orbit: {
    full_name?: string;
    orbit_class?: string | null;
    neo?: boolean;
    pha?: boolean;
    condition_code?: string | null;
    elements?: Record<string, { value: number | null; units?: string | null; title?: string | null }>;
    physical_parameters?: Record<string, { value: number | null; units?: string | null }>;
    [key: string]: unknown;
  } | null;
}

export interface ChangeCandidate {
  id: string;
  comparison_id: string;
  x: number;
  y: number;
  ra: number;
  dec: number;
  change_type: string;
  motion_arcsec: number;
  brightness_change: number;
  score: number;
  metadata_json: {
    possible_class?: string;
    note?: string;
    significance_sigma?: number;
    solar_system_identification?: SolarSystemIdentification;
    [key: string]: unknown;
  } | null;
}

export interface Comparison {
  id: string;
  observation_a_id: string;
  observation_b_id: string;
  status: string;
  aligned_a_path: string | null;
  aligned_b_path: string | null;
  difference_path: string | null;
  significance_path: string | null;
  summary_json: {
    target_name?: string;
    time_interval_days?: number;
    epoch_a_date?: string;
    epoch_b_date?: string;
    spectral_band?: number;
    rms_difference?: number;
    change_count?: number;
    scientific_note?: string;
    metadata?: Record<string, unknown>;
  } | null;
  created_at: string;
  completed_at: string | null;
  observationA?: Observation;
  observationB?: Observation;
  candidates?: ChangeCandidate[];
  movingObjects?: MovingObjectMatch[];
}

export interface ProcessingJob {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  attempts: number;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface BootstrapData {
  featuredRegion: SkyRegion | null;
  demoObservations: Observation[];
  demoComparisonId: string | null;
  serverStatus: "healthy";
  workerStatus: "active" | "idle" | "offline";
  dataSource: {
    label: string;
    archive: string;
    collection: string;
    level: string;
    discoveryService?: string;
    cutoutService?: string;
  };
  integrations?: NasaIntegrations;
}

export interface NasaIntegrations {
  irsa: {
    archive: string;
    service: string;
    endpoint: string;
    collections: string[];
    defaultCollection: string;
    requiresApiKey: boolean;
  };
  jpl: {
    horizons: string;
    smallBodyDatabase: string;
    smallBodyIdentification: string;
    requiresApiKey: boolean;
  };
  nasaApi: { service: string; configured: boolean };
}

/** One SPHEREx product as NASA/IPAC IRSA's SIA2 service describes it. */
export interface ArchiveProduct {
  archiveId: string;
  obsId: string | null;
  collection: string;
  detector: number;
  bandNumber: number;
  bandpass: string | null;
  observationDate: string;
  observationEnd: string | null;
  exposureTimeSeconds: number | null;
  ra: number | null;
  dec: number | null;
  wavelengthMinUm: number | null;
  wavelengthMaxUm: number | null;
  accessUrl: string;
  accessEstimatedSizeKb: number | null;
  instrument: string | null;
  facility: string | null;
  targetName: string | null;
  pixelScaleArcsec: number | null;
  width: number;
  height: number;
}

export interface ArchiveSearchResult {
  collection: string;
  ra: number;
  dec: number;
  radiusDeg: number;
  band: number | null;
  totalMatched: number;
  returned: number;
  products: ArchiveProduct[];
  epochRange: { start: string; end: string } | null;
  bands: number[];
  source: { archive: string; service: string; endpoint: string; requiresApiKey: boolean };
}

export interface EphemerisRow {
  timeUtc: string | null;
  raDeg: number | null;
  decDeg: number | null;
  raRateArcsecPerHour: number | null;
  decRateArcsecPerHour: number | null;
  motionArcsecPerHour: number | null;
  apparentMagnitude: number | null;
  heliocentricDistanceAu: number | null;
  observerDistanceAu: number | null;
  solarElongationDeg: number | null;
  phaseAngleDeg: number | null;
}

export interface EphemerisResult {
  target: string;
  center: string;
  rows: EphemerisRow[];
  source: string;
}

export interface MovingObjectInField {
  name: string;
  designation: string;
  ra: number;
  dec: number;
  offsetArcsec: number | null;
  apparentMagnitude: number | null;
  motionArcsecPerHour: number | null;
  epochUtc: string;
  pass: "first" | "second";
  source: string;
}

export interface IdentifyResult {
  ra: number;
  dec: number;
  halfWidthDeg: number;
  epochUtc: string;
  vmagLimit: number;
  observer: string;
  pass: "first" | "second";
  count: number;
  objects: MovingObjectInField[];
  source: string;
}

export interface ReviewItem {
  comparisonId: string;
  candidateId: string | null;
  candidate: ChangeCandidate | null;
  comparison: Comparison | null;
}

export interface ReviewStats {
  totalReviews: number;
  classifications: Record<string, number>;
  averageConfidence: number;
}

export type ObservationReviewClassification = "clear" | "faint" | "artifact" | "uncertain";
export type ObservationReviewFlag = "noise" | "saturation" | "edge" | "structured-background";
export interface ObservationReviewInput {
  observationId: string;
  classification: ObservationReviewClassification;
  confidence: number;
  flags: ObservationReviewFlag[];
  note: string;
}
export interface ObservationReview extends ObservationReviewInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface ObservationReviewStats {
  totalReviews: number;
  classifications: Record<string, number>;
}
