ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(32) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS password_updated_at DATETIME NULL AFTER password_hash,
  ADD KEY IF NOT EXISTS idx_app_users_role (role);

UPDATE app_users
SET
  phone_normalized = CASE
    WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '') <> ''
      THEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')
    ELSE CONCAT('u', SUBSTRING(REPLACE(id, '-', ''), 1, 31))
  END,
  password_updated_at = COALESCE(password_updated_at, created_at)
WHERE phone_normalized IS NULL OR phone_normalized = '' OR password_updated_at IS NULL;

UPDATE app_users u
JOIN (
  SELECT phone_normalized
  FROM app_users
  GROUP BY phone_normalized
  HAVING COUNT(*) > 1
) duplicated ON duplicated.phone_normalized = u.phone_normalized
SET u.phone_normalized = CONCAT(
  LEFT(u.phone_normalized, 20),
  RIGHT(REPLACE(u.id, '-', ''), 12)
);

ALTER TABLE app_users
  MODIFY COLUMN phone_normalized VARCHAR(32) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_app_users_phone_normalized (phone_normalized);

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32) NOT NULL DEFAULT '' AFTER address,
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(32) NOT NULL DEFAULT '' AFTER phone,
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(120) NOT NULL DEFAULT '' AFTER whatsapp,
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(160) NOT NULL DEFAULT '' AFTER instagram,
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL AFTER tagline,
  ADD COLUMN IF NOT EXISTS logo_text VARCHAR(50) NOT NULL DEFAULT '' AFTER description,
  ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500) NOT NULL DEFAULT '' AFTER logo_text,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(190) NULL AFTER cover_url,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Tunis' AFTER slug,
  ADD COLUMN IF NOT EXISTS audience ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex' AFTER timezone,
  ADD COLUMN IF NOT EXISTS years_in_business INT NOT NULL DEFAULT 1 AFTER audience,
  ADD COLUMN IF NOT EXISTS booking_mode ENUM('instant', 'approval_required') NOT NULL DEFAULT 'approval_required' AFTER years_in_business,
  ADD COLUMN IF NOT EXISTS operating_mode ENUM('appointment_only', 'walk_ins', 'both') NOT NULL DEFAULT 'appointment_only' AFTER booking_mode,
  ADD COLUMN IF NOT EXISTS response_window VARCHAR(120) NOT NULL DEFAULT 'moins de 1h' AFTER operating_mode,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER response_window,
  ADD COLUMN IF NOT EXISTS address_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER phone_verified,
  ADD COLUMN IF NOT EXISTS response_time_tracked BOOLEAN NOT NULL DEFAULT FALSE AFTER address_verified,
  ADD COLUMN IF NOT EXISTS cancellation_notice VARCHAR(190) NOT NULL DEFAULT '' AFTER response_time_tracked,
  ADD COLUMN IF NOT EXISTS late_arrival_grace_minutes INT NOT NULL DEFAULT 10 AFTER cancellation_notice,
  ADD COLUMN IF NOT EXISTS no_show_rule TEXT NOT NULL AFTER late_arrival_grace_minutes,
  ADD COLUMN IF NOT EXISTS hygiene_note TEXT NULL AFTER no_show_rule,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT FALSE AFTER hygiene_note,
  ADD COLUMN IF NOT EXISTS children_accepted BOOLEAN NOT NULL DEFAULT TRUE AFTER deposit_required,
  ADD COLUMN IF NOT EXISTS policy_clarity ENUM('clear', 'needs_review') NOT NULL DEFAULT 'needs_review' AFTER children_accepted,
  ADD COLUMN IF NOT EXISTS profile_views INT NOT NULL DEFAULT 0 AFTER policy_clarity,
  ADD COLUMN IF NOT EXISTS featured_until DATETIME NULL AFTER profile_views,
  ADD COLUMN IF NOT EXISTS featured_rank INT NULL AFTER featured_until,
  ADD COLUMN IF NOT EXISTS featured_city_slug VARCHAR(80) NULL AFTER featured_rank,
  ADD COLUMN IF NOT EXISTS featured_category_slug VARCHAR(80) NULL AFTER featured_city_slug,
  ADD COLUMN IF NOT EXISTS featured_copy TEXT NULL AFTER featured_category_slug,
  ADD KEY IF NOT EXISTS idx_business_profiles_status (status),
  ADD KEY IF NOT EXISTS idx_business_profiles_city_slug (city_slug),
  ADD KEY IF NOT EXISTS idx_business_profiles_category_slug (category_slug),
  ADD KEY IF NOT EXISTS idx_business_profiles_featured_rank (featured_rank);

UPDATE business_profiles
SET
  timezone = CASE WHEN timezone IS NULL OR timezone = '' THEN 'Africa/Tunis' ELSE timezone END,
  slug = CASE
    WHEN slug IS NOT NULL AND slug <> '' THEN slug
    ELSE CONCAT('biz-', SUBSTRING(REPLACE(id, '-', ''), 1, 20))
  END
WHERE timezone IS NULL OR timezone = '' OR slug IS NULL OR slug = '';

UPDATE business_profiles bp
JOIN (
  SELECT slug
  FROM business_profiles
  GROUP BY slug
  HAVING COUNT(*) > 1
) duplicated ON duplicated.slug = bp.slug
SET bp.slug = CONCAT(
  LEFT(bp.slug, 24),
  '-',
  RIGHT(REPLACE(bp.id, '-', ''), 12)
);

ALTER TABLE business_profiles
  MODIFY COLUMN slug VARCHAR(190) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_business_profiles_slug (slug);

CREATE TABLE IF NOT EXISTS staff_members (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT '',
  bio TEXT NULL,
  phone VARCHAR(32) NOT NULL DEFAULT '',
  color_hex VARCHAR(7) NOT NULL DEFAULT '#C8A96B',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_staff_members_business_id (business_id),
  KEY idx_staff_members_active (is_active),
  CONSTRAINT fk_staff_members_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE AFTER active,
  ADD COLUMN IF NOT EXISTS gender_target ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex' AFTER featured,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER gender_target,
  ADD KEY IF NOT EXISTS idx_services_business_id (business_id),
  ADD KEY IF NOT EXISTS idx_services_active (active),
  ADD KEY IF NOT EXISTS idx_services_sort_order (business_id, sort_order);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  reason VARCHAR(160) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  staff_member_id VARCHAR(36) NULL,
  exception_type ENUM('blocked', 'closed') NOT NULL DEFAULT 'blocked',
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  reason VARCHAR(160) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_availability_exceptions_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_availability_exceptions_staff
    FOREIGN KEY (staff_member_id)
    REFERENCES staff_members (id)
    ON DELETE SET NULL,
  KEY idx_availability_exceptions_business_id (business_id),
  KEY idx_availability_exceptions_staff_id (staff_member_id),
  KEY idx_availability_exceptions_range (business_id, start_at, end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO availability_exceptions (id, business_id, start_at, end_at, reason, exception_type, created_at, updated_at)
SELECT bs.id, bs.business_id, bs.start_at, bs.end_at, bs.reason, 'blocked', bs.created_at, bs.updated_at
FROM blocked_slots bs
LEFT JOIN availability_exceptions ae ON ae.id = bs.id
WHERE ae.id IS NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_user_id VARCHAR(36) NULL AFTER service_id,
  ADD COLUMN IF NOT EXISTS customer_phone_normalized VARCHAR(32) NOT NULL DEFAULT '' AFTER customer_phone,
  ADD KEY IF NOT EXISTS idx_bookings_customer_user_id (customer_user_id),
  ADD KEY IF NOT EXISTS idx_bookings_customer_phone (customer_phone_normalized),
  ADD KEY IF NOT EXISTS idx_bookings_end_at (end_at),
  ADD KEY IF NOT EXISTS idx_bookings_business_window (business_id, start_at, end_at);

UPDATE bookings
SET status = 'cancelled'
WHERE status IN ('cancelled_by_customer', 'cancelled_by_business', 'expired');

ALTER TABLE bookings
  MODIFY COLUMN status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'rejected',
    'completed',
    'no_show'
  ) NOT NULL DEFAULT 'pending';

UPDATE bookings
SET customer_phone_normalized = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')
WHERE customer_phone_normalized = '';

UPDATE bookings b
JOIN app_users u ON u.phone_normalized = b.customer_phone_normalized
SET b.customer_user_id = u.id
WHERE b.customer_user_id IS NULL;

SET @fk_bookings_customer_user_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND CONSTRAINT_NAME = 'fk_bookings_customer_user'
);
SET @fk_bookings_customer_user_sql = IF(
  @fk_bookings_customer_user_exists = 0,
  'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer_user FOREIGN KEY (customer_user_id) REFERENCES app_users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE fk_bookings_customer_user_stmt FROM @fk_bookings_customer_user_sql;
EXECUTE fk_bookings_customer_user_stmt;
DEALLOCATE PREPARE fk_bookings_customer_user_stmt;

CREATE TABLE IF NOT EXISTS booking_slot_locks (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(36) NOT NULL,
  business_id VARCHAR(36) NOT NULL,
  slot_start_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_slot_locks_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_slot_locks_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_booking_slot_locks_business_slot (business_id, slot_start_at),
  KEY idx_booking_slot_locks_booking_id (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_events (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(36) NOT NULL,
  business_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  actor_role ENUM('customer', 'shop', 'admin', 'system', 'public') NOT NULL,
  event_type ENUM('created', 'status_changed', 'reschedule_requested') NOT NULL,
  previous_status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'rejected',
    'completed',
    'no_show'
  ) NULL,
  next_status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'rejected',
    'completed',
    'no_show'
  ) NULL,
  reason VARCHAR(120) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_events_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_events_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_events_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES app_users (id)
    ON DELETE SET NULL,
  KEY idx_booking_events_booking_id (booking_id),
  KEY idx_booking_events_business_id (business_id),
  KEY idx_booking_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE moderation_history
  ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(36) NULL AFTER business_id;

SET @fk_moderation_history_actor_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'moderation_history'
    AND CONSTRAINT_NAME = 'fk_moderation_history_actor'
);
SET @fk_moderation_history_actor_sql = IF(
  @fk_moderation_history_actor_exists = 0,
  'ALTER TABLE moderation_history ADD CONSTRAINT fk_moderation_history_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE fk_moderation_history_actor_stmt FROM @fk_moderation_history_actor_sql;
EXECUTE fk_moderation_history_actor_stmt;
DEALLOCATE PREPARE fk_moderation_history_actor_stmt;

ALTER TABLE waitlist_requests
  ADD COLUMN IF NOT EXISTS preferred_date DATETIME NULL AFTER customer_note,
  ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(60) NOT NULL DEFAULT '' AFTER preferred_date;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS sequence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST,
  ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(36) NULL AFTER booking_id,
  ADD COLUMN IF NOT EXISTS metadata JSON NULL AFTER summary;

SET @fk_activity_logs_actor_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'activity_logs'
    AND CONSTRAINT_NAME = 'fk_activity_logs_actor'
);
SET @fk_activity_logs_actor_sql = IF(
  @fk_activity_logs_actor_exists = 0,
  'ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_user_id) REFERENCES app_users (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE fk_activity_logs_actor_stmt FROM @fk_activity_logs_actor_sql;
EXECUTE fk_activity_logs_actor_stmt;
DEALLOCATE PREPARE fk_activity_logs_actor_stmt;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NULL,
  revoked_at DATETIME NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES app_users (id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user_id (user_id),
  KEY idx_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  purpose ENUM('login', 'password_reset', 'booking_access') NOT NULL,
  user_id VARCHAR(36) NULL,
  reference_code VARCHAR(12) NULL,
  customer_phone_normalized VARCHAR(32) NULL,
  delivery_channel ENUM('email', 'sms') NOT NULL,
  destination VARCHAR(255) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_challenges_user
    FOREIGN KEY (user_id)
    REFERENCES app_users (id)
    ON DELETE CASCADE,
  KEY idx_auth_challenges_user_id (user_id),
  KEY idx_auth_challenges_reference_code (reference_code),
  KEY idx_auth_challenges_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_access_sessions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reference_code VARCHAR(12) NOT NULL,
  customer_phone_normalized VARCHAR(32) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_access_sessions_reference
    FOREIGN KEY (reference_code)
    REFERENCES bookings (reference_code)
    ON DELETE CASCADE,
  UNIQUE KEY uq_booking_access_sessions_token_hash (token_hash),
  KEY idx_booking_access_sessions_reference_code (reference_code),
  KEY idx_booking_access_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key VARCHAR(190) NOT NULL PRIMARY KEY,
  request_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rate_limit_buckets_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW users AS
SELECT
  id,
  role,
  name,
  email,
  phone,
  phone_normalized,
  created_at,
  updated_at
FROM app_users;

CREATE OR REPLACE VIEW businesses AS
SELECT
  id,
  owner_user_id,
  slug,
  status,
  timezone,
  booking_mode,
  operating_mode,
  created_at,
  updated_at
FROM business_profiles;
