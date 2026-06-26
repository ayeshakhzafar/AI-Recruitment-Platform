-- RECRUTO: application users (HR / admin login)
-- Run against your MySQL database (same DB as the rest of the app).
-- Example: mysql -u USER -p DATABASE < migrations/001_app_users.sql

CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) DEFAULT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'hr',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_users_email (email),
  INDEX idx_app_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
