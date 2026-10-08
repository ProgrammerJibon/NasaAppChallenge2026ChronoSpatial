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
  };
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
