-- 003_moving_object_matches.sql
-- NASA JPL solar-system identifications for detected change candidates.
-- Rows are produced by the Python worker's IDENTIFY_OBJECTS job, which asks
-- the JPL Small-Body Identification service which known minor planets and
-- comets were inside a SPHEREx field at the epoch of the later observation and
-- cross-matches them against the candidates found in the difference image.

CREATE TABLE IF NOT EXISTS moving_object_matches (
  id VARCHAR(64) PRIMARY KEY,
  comparison_id VARCHAR(64) NOT NULL,
  candidate_id VARCHAR(64) NULL,
  object_name VARCHAR(255) NOT NULL,
  object_designation VARCHAR(128) NULL,
  ra DOUBLE NOT NULL,
  `dec` DOUBLE NOT NULL,
  separation_arcsec DOUBLE NOT NULL DEFAULT 0.0,
  offset_arcsec DOUBLE NULL,
  apparent_magnitude DOUBLE NULL,
  ra_rate_arcsec_per_hour DOUBLE NULL,
  dec_rate_arcsec_per_hour DOUBLE NULL,
  motion_arcsec_per_hour DOUBLE NULL,
  epoch_utc DATETIME(3) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'NASA/JPL Small-Body Identification',
  orbit_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_mom_candidate_object (candidate_id, object_name),
  INDEX idx_mom_comparison (comparison_id),
  INDEX idx_mom_designation (object_designation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
