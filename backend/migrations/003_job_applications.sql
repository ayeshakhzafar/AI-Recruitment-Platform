-- Job applications: candidates (app_users.role = 'candidate') apply to job_postings
-- Optional manual run if auto-create from main.py startup is disabled.

CREATE TABLE IF NOT EXISTS job_applications (
  application_id VARCHAR(64) PRIMARY KEY,
  candidate_user_id INT NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'applied',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_candidate_job (candidate_user_id, job_id),
  INDEX idx_ja_job (job_id),
  INDEX idx_ja_candidate (candidate_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
