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
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  audience ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex',
  years_in_business INT NOT NULL DEFAULT 1,
  booking_mode ENUM('instant', 'approval_required') NOT NULL DEFAULT 'approval_required',
  operating_mode ENUM('appointment_only', 'walk_ins', 'both') NOT NULL DEFAULT 'appointment_only',
  response_window VARCHAR(120) NOT NULL DEFAULT 'moins de 1h',
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
  CONSTRAINT fk_business_profiles_owner
    FOREIGN KEY (owner_user_id)
    REFERENCES app_users (id)
    ON DELETE CASCADE,
  KEY idx_business_profiles_status (status),
  KEY idx_business_profiles_city_slug (city_slug),
  KEY idx_business_profiles_category_slug (category_slug)
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
  KEY idx_services_active (active)
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

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reference_code VARCHAR(12) NOT NULL UNIQUE,
  business_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  customer_note TEXT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM(
    'pending',
    'confirmed',
    'completed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'rejected',
    'expired',
    'no_show'
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
  KEY idx_bookings_business_id (business_id),
  KEY idx_bookings_status (status),
  KEY idx_bookings_start_at (start_at),
  KEY idx_bookings_customer_phone (customer_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocked_slots (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  reason VARCHAR(160) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_blocked_slots_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  KEY idx_blocked_slots_business_id (business_id),
  KEY idx_blocked_slots_start_at (start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  type ENUM('cover', 'gallery') NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(160) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_items_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  KEY idx_media_items_business_id (business_id),
  KEY idx_media_items_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moderation_history (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
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

INSERT INTO app_users (id, role, name, email, phone, password_hash)
SELECT
  'admin-local-1',
  'admin',
  'Reservee Admin',
  'admin@reservee.tn',
  '+216 00 000 000',
  '096af41a2e3b6554247a0dde7903c0ed:6128d946648b02287710c0b2e23544b38e0bd9475d694cc29e825cfdb110dae31c5704995801159398bc9274efeca4682248ba2cab660a01d340af6446761506'
WHERE NOT EXISTS (
  SELECT 1
  FROM app_users
  WHERE email = 'admin@reservee.tn'
);
