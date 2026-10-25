CREATE DATABASE IF NOT EXISTS sight_insights;
USE sight_insights;

CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  strategy ENUM('mobile','desktop') NOT NULL,
  score INT NOT NULL,
  fcp_ms INT,
  lcp_ms INT,
  tbt_ms INT,
  cls DECIMAL(6,3),
  speed_index_ms INT,
  total_bytes INT,
  issues_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_created (site_id, created_at)
);
