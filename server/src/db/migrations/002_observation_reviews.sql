CREATE TABLE IF NOT EXISTS observation_reviews (
  id VARCHAR(64) PRIMARY KEY,
  observation_id VARCHAR(64) NOT NULL,
  visitor_hash VARCHAR(64) NOT NULL,
  classification VARCHAR(32) NOT NULL,
  confidence DOUBLE NOT NULL,
  flags_json JSON NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_observation_visitor (observation_id, visitor_hash),
  INDEX idx_observation_review_observation (observation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
