USE reservee_tn;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER email,
  ADD COLUMN IF NOT EXISTS image VARCHAR(500) NULL AFTER email_verified,
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

UPDATE app_users
SET email_verified = TRUE
WHERE email_verified IS NULL;

CREATE TABLE IF NOT EXISTS `session` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  expiresAt TIMESTAMP(3) NOT NULL,
  token VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ipAddress TEXT NULL,
  userAgent TEXT NULL,
  userId VARCHAR(36) NOT NULL,
  CONSTRAINT fk_better_auth_session_user
    FOREIGN KEY (userId)
    REFERENCES app_users (id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_better_auth_session_token (token),
  KEY idx_better_auth_session_user_id (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account` (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  accountId VARCHAR(255) NOT NULL,
  providerId VARCHAR(255) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  accessToken TEXT NULL,
  refreshToken TEXT NULL,
  idToken TEXT NULL,
  accessTokenExpiresAt TIMESTAMP(3) NULL,
  refreshTokenExpiresAt TIMESTAMP(3) NULL,
  scope TEXT NULL,
  password TEXT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_better_auth_account_user
    FOREIGN KEY (userId)
    REFERENCES app_users (id)
    ON DELETE CASCADE,
  KEY idx_better_auth_account_user_id (userId),
  KEY idx_better_auth_account_provider_account (providerId, accountId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  expiresAt TIMESTAMP(3) NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_better_auth_verification_identifier (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
