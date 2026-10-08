-- 001_initial.sql: SPHEREx Atlas reduced schema

CREATE TABLE IF NOT EXISTS sky_regions (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ra DOUBLE NOT NULL,
  `dec` DOUBLE NOT NULL,
  radius_deg DOUBLE NOT NULL DEFAULT 0.25,
  is_featured BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS archive_queries (
  id VARCHAR(64) PRIMARY KEY,
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  ra DOUBLE NOT NULL,
  `dec` DOUBLE NOT NULL,
  radius_deg DOUBLE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  result_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS observations (
  id VARCHAR(64) PRIMARY KEY,
  archive_id VARCHAR(128) NOT NULL,
  region_id VARCHAR(64) NULL,
  observation_date DATETIME(3) NOT NULL,
  ra DOUBLE NOT NULL,
  `dec` DOUBLE NOT NULL,
  band_number INT NOT NULL,
  wavelength_min_um DOUBLE NOT NULL,
  wavelength_max_um DOUBLE NOT NULL,
  archive_url TEXT NULL,
  fits_path VARCHAR(512) NULL,
  preview_path VARCHAR(512) NULL,
  width INT NOT NULL DEFAULT 0,
  height INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_obs_region (region_id),
  INDEX idx_obs_date (observation_date),
  INDEX idx_obs_band (band_number),
  INDEX idx_obs_archive (archive_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comparisons (
  id VARCHAR(64) PRIMARY KEY,
  observation_a_id VARCHAR(64) NOT NULL,
  observation_b_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  aligned_a_path VARCHAR(512) NULL,
  aligned_b_path VARCHAR(512) NULL,
  difference_path VARCHAR(512) NULL,
  significance_path VARCHAR(512) NULL,
  summary_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  INDEX idx_comp_pair (observation_a_id, observation_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS change_candidates (
  id VARCHAR(64) PRIMARY KEY,
  comparison_id VARCHAR(64) NOT NULL,
  x DOUBLE NOT NULL,
  y DOUBLE NOT NULL,
  ra DOUBLE NOT NULL,
  `dec` DOUBLE NOT NULL,
  change_type VARCHAR(64) NOT NULL,
  motion_arcsec DOUBLE NOT NULL DEFAULT 0.0,
  brightness_change DOUBLE NOT NULL DEFAULT 0.0,
  score DOUBLE NOT NULL DEFAULT 0.0,
  metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_cand_comp (comparison_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  comparison_id VARCHAR(64) NOT NULL,
  candidate_id VARCHAR(64) NULL,
  visitor_hash VARCHAR(64) NOT NULL,
  classification VARCHAR(64) NOT NULL,
  confidence DOUBLE NOT NULL DEFAULT 1.0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_rev_comp (comparison_id),
  INDEX idx_rev_cand (candidate_id),
  INDEX idx_rev_visitor (visitor_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS processing_jobs (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  priority INT NOT NULL DEFAULT 0,
  payload_json JSON NULL,
  result_json JSON NULL,
  progress DOUBLE NOT NULL DEFAULT 0.0,
  attempts INT NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) NULL,
  heartbeat_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  INDEX idx_jobs_status_prio (status, priority, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(64) PRIMARY KEY,
  token_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_admin_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
