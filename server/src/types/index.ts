export interface SkyRegionRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ra: number;
  dec: number;
  radius_deg: number;
  is_featured: boolean;
  created_at: Date;
}

export interface ArchiveQueryRow {
  id: string;
  query_hash: string;
  ra: number;
  dec: number;
  radius_deg: number;
  status: string;
  result_count: number;
  created_at: Date;
  expires_at: Date | null;
}

export interface ObservationRow {
  id: string;
  archive_id: string;
  region_id: string | null;
  observation_date: Date;
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
  metadata_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface ComparisonRow {
  id: string;
  observation_a_id: string;
  observation_b_id: string;
  status: string;
  aligned_a_path: string | null;
  aligned_b_path: string | null;
  difference_path: string | null;
  significance_path: string | null;
  summary_json: Record<string, unknown> | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ChangeCandidateRow {
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
  metadata_json: Record<string, unknown> | null;
  created_at: Date;
}

export interface ReviewRow {
  id: string;
  comparison_id: string;
  candidate_id: string | null;
  visitor_hash: string;
  classification: string;
  confidence: number;
  created_at: Date;
}

export interface ProcessingJobRow {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  payload_json: Record<string, unknown> | null;
  result_json: Record<string, unknown> | null;
  progress: number;
  attempts: number;
  error: string | null;
  created_at: Date;
  started_at: Date | null;
  heartbeat_at: Date | null;
  completed_at: Date | null;
}

export interface AdminSessionRow {
  id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface BootstrapResponse {
  featuredRegion: SkyRegionRow | null;
  demoObservations: ObservationRow[];
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
