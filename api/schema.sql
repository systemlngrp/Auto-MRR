CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  firm_id VARCHAR(64) NOT NULL,
  login_id VARCHAR(120) NOT NULL,
  user_email VARCHAR(190) DEFAULT NULL,
  display_name VARCHAR(190) DEFAULT NULL,
  role VARCHAR(80) DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  password_plain VARCHAR(190) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_firm_login (firm_id, login_id),
  KEY idx_users_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  firm_id VARCHAR(64) NOT NULL,
  sheet_name VARCHAR(120) NOT NULL,
  row_type VARCHAR(40) NOT NULL,
  row_sort INT NOT NULL DEFAULT 0,
  record_group_id VARCHAR(255) DEFAULT NULL,
  mrr_number VARCHAR(120) DEFAULT NULL,
  ge_no VARCHAR(120) DEFAULT NULL,
  invoice_no VARCHAR(190) DEFAULT NULL,
  supplier VARCHAR(255) DEFAULT NULL,
  truck_no VARCHAR(120) DEFAULT NULL,
  pending_stage VARCHAR(80) DEFAULT NULL,
  date_value VARCHAR(40) DEFAULT NULL,
  approval_status_plant VARCHAR(40) DEFAULT NULL,
  approval_status_accounts VARCHAR(40) DEFAULT NULL,
  approval_status_md VARCHAR(40) DEFAULT NULL,
  tally_posted TINYINT(1) NOT NULL DEFAULT 0,
  data_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_records_sheet (firm_id, sheet_name),
  KEY idx_records_mrr (firm_id, mrr_number),
  KEY idx_records_ge (firm_id, ge_no),
  KEY idx_records_pair (firm_id, ge_no, mrr_number),
  KEY idx_records_group (firm_id, record_group_id),
  KEY idx_records_lookup (firm_id, sheet_name, ge_no, mrr_number, row_type, row_sort),
  KEY idx_records_pending (firm_id, pending_stage),
  KEY idx_records_invoice (firm_id, invoice_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  firm_id VARCHAR(64) NOT NULL,
  ge_no VARCHAR(120) DEFAULT NULL,
  mrr_number VARCHAR(120) NOT NULL,
  record_group_id VARCHAR(255) DEFAULT NULL,
  stage_name VARCHAR(80) NOT NULL,
  decision_value VARCHAR(40) NOT NULL,
  user_email VARCHAR(190) DEFAULT NULL,
  remark_text TEXT DEFAULT NULL,
  extra_json LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approval_logs_mrr (firm_id, mrr_number, stage_name),
  KEY idx_approval_logs_pair (firm_id, ge_no, mrr_number, stage_name),
  KEY idx_approval_logs_group (firm_id, record_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_users (
  firm_id,
  login_id,
  user_email,
  display_name,
  role,
  password_plain,
  active
)
VALUES
  ('lnki', 'system', 'system@lngrp', 'System Test', 'admin', 'abcd', 1)
ON DUPLICATE KEY UPDATE
  updated_at = CURRENT_TIMESTAMP;
