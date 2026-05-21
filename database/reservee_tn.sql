CREATE DATABASE IF NOT EXISTS reservee_tn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reservee_tn;

CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  role ENUM('customer', 'shop', 'admin') NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  phone_normalized VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_users_email (email),
  UNIQUE KEY uq_app_users_phone_normalized (phone_normalized),
  KEY idx_app_users_role (role)
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

CREATE TABLE IF NOT EXISTS business_profiles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  owner_user_id VARCHAR(36) NOT NULL,
  business_name VARCHAR(160) NOT NULL,
  category_slug ENUM('barbers', 'hair-salons', 'beauty-centers', 'nail-studios', 'spas') NOT NULL,
  city_slug VARCHAR(80) NOT NULL,
  area VARCHAR(120) NOT NULL,
  address VARCHAR(190) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  whatsapp VARCHAR(32) NOT NULL DEFAULT '',
  instagram VARCHAR(120) NOT NULL DEFAULT '',
  tagline VARCHAR(160) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  logo_text VARCHAR(50) NOT NULL DEFAULT '',
  cover_url VARCHAR(500) NOT NULL DEFAULT '',
  slug VARCHAR(190) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Tunis',
  audience ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex',
  years_in_business INT NOT NULL DEFAULT 1,
  booking_mode ENUM('instant', 'approval_required') NOT NULL DEFAULT 'approval_required',
  operating_mode ENUM('appointment_only', 'walk_ins', 'both') NOT NULL DEFAULT 'appointment_only',
  response_window VARCHAR(120) NOT NULL DEFAULT 'moins de 1h',
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  address_verified BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_tracked BOOLEAN NOT NULL DEFAULT FALSE,
  cancellation_notice VARCHAR(190) NOT NULL DEFAULT '',
  late_arrival_grace_minutes INT NOT NULL DEFAULT 10,
  no_show_rule TEXT NOT NULL,
  hygiene_note TEXT NULL,
  deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  children_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  policy_clarity ENUM('clear', 'needs_review') NOT NULL DEFAULT 'needs_review',
  profile_views INT NOT NULL DEFAULT 0,
  featured_until DATETIME NULL,
  featured_rank INT NULL,
  featured_city_slug VARCHAR(80) NULL,
  featured_category_slug VARCHAR(80) NULL,
  featured_copy TEXT NULL,
  status ENUM(
    'draft',
    'pending_review',
    'changes_requested',
    'approved',
    'featured',
    'suspended',
    'archived'
  ) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_profiles_owner (owner_user_id),
  UNIQUE KEY uq_business_profiles_slug (slug),
  KEY idx_business_profiles_status (status),
  KEY idx_business_profiles_city_slug (city_slug),
  KEY idx_business_profiles_category_slug (category_slug),
  KEY idx_business_profiles_featured_rank (featured_rank),
  CONSTRAINT fk_business_profiles_owner
    FOREIGN KEY (owner_user_id)
    REFERENCES app_users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  gender_target ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  KEY idx_services_business_id (business_id),
  KEY idx_services_active (active),
  KEY idx_services_sort_order (business_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_hours (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  day_of_week INT NOT NULL COMMENT '0=Sunday, 6=Saturday',
  open_time VARCHAR(5) NOT NULL,
  close_time VARCHAR(5) NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  breaks JSON NULL COMMENT 'Array of {start, end} objects',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_business_hours_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  KEY idx_business_hours_business_id (business_id),
  UNIQUE KEY uq_business_hours_business_day (business_id, day_of_week)
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

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reference_code VARCHAR(12) NOT NULL UNIQUE,
  business_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  customer_user_id VARCHAR(36) NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  customer_phone_normalized VARCHAR(32) NOT NULL,
  customer_note TEXT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM(
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
  ) NOT NULL DEFAULT 'pending',
  source ENUM('web', 'dashboard') NOT NULL DEFAULT 'web',
  expires_at DATETIME NULL,
  reschedule_requested_at DATETIME NULL,
  status_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bookings_service
    FOREIGN KEY (service_id)
    REFERENCES services (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_customer_user
    FOREIGN KEY (customer_user_id)
    REFERENCES app_users (id)
    ON DELETE SET NULL,
  KEY idx_bookings_business_id (business_id),
  KEY idx_bookings_customer_user_id (customer_user_id),
  KEY idx_bookings_customer_phone (customer_phone_normalized),
  KEY idx_bookings_status (status),
  KEY idx_bookings_start_at (start_at),
  KEY idx_bookings_end_at (end_at),
  KEY idx_bookings_business_window (business_id, start_at, end_at),
  KEY idx_bookings_business_status_start_at (business_id, status, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
  ) NULL,
  next_status ENUM(
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
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

CREATE TABLE IF NOT EXISTS media_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  type ENUM('cover', 'gallery') NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(160) NOT NULL DEFAULT '',
  storage_provider VARCHAR(32) NOT NULL DEFAULT 'external_url',
  storage_key VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  file_size_bytes BIGINT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_items_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  KEY idx_media_items_business_id (business_id),
  KEY idx_media_items_type (type),
  KEY idx_media_items_business_type_sort (business_id, type, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moderation_history (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  status ENUM(
    'draft',
    'pending_review',
    'changes_requested',
    'approved',
    'featured',
    'suspended',
    'archived'
  ) NOT NULL,
  internal_note TEXT NOT NULL DEFAULT '',
  business_message TEXT NOT NULL DEFAULT '',
  changed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_moderation_history_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_moderation_history_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES app_users (id)
    ON DELETE SET NULL,
  KEY idx_moderation_history_business_id (business_id),
  KEY idx_moderation_history_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waitlist_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  customer_note TEXT NULL,
  preferred_date DATETIME NULL,
  preferred_time VARCHAR(60) NOT NULL DEFAULT '',
  preferred_date_range VARCHAR(120) NULL,
  status ENUM('active', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_waitlist_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_service
    FOREIGN KEY (service_id)
    REFERENCES services (id)
    ON DELETE CASCADE,
  KEY idx_waitlist_business_id (business_id),
  KEY idx_waitlist_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  sequence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  type ENUM(
    'business_status_changed',
    'business_featured',
    'business_unfeatured',
    'business_settings_edited',
    'booking_created',
    'booking_status_changed',
    'booking_reschedule_requested',
    'waitlist_request_created'
  ) NOT NULL,
  business_id VARCHAR(36) NULL,
  booking_id VARCHAR(36) NULL,
  actor_user_id VARCHAR(36) NULL,
  summary TEXT NOT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_logs_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES app_users (id)
    ON DELETE SET NULL,
  KEY idx_activity_logs_business_id (business_id),
  KEY idx_activity_logs_booking_id (booking_id),
  KEY idx_activity_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
