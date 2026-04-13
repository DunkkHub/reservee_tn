USE reservee_tn;

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32) NOT NULL DEFAULT '' AFTER address,
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(32) NOT NULL DEFAULT '' AFTER phone,
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(120) NOT NULL DEFAULT '' AFTER whatsapp,
  ADD COLUMN IF NOT EXISTS tagline VARCHAR(160) NOT NULL DEFAULT '' AFTER instagram,
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL AFTER tagline,
  ADD COLUMN IF NOT EXISTS logo_text VARCHAR(50) NOT NULL DEFAULT '' AFTER description,
  ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500) NOT NULL DEFAULT '' AFTER logo_text,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(190) NOT NULL DEFAULT '' AFTER cover_url,
  ADD COLUMN IF NOT EXISTS audience ENUM('women', 'men', 'unisex') NOT NULL DEFAULT 'unisex' AFTER slug,
  ADD COLUMN IF NOT EXISTS years_in_business INT NOT NULL DEFAULT 1 AFTER audience,
  ADD COLUMN IF NOT EXISTS booking_mode ENUM('instant', 'approval_required') NOT NULL DEFAULT 'approval_required' AFTER years_in_business,
  ADD COLUMN IF NOT EXISTS operating_mode ENUM('appointment_only', 'walk_ins', 'both') NOT NULL DEFAULT 'appointment_only' AFTER booking_mode,
  ADD COLUMN IF NOT EXISTS response_window VARCHAR(120) NOT NULL DEFAULT 'moins de 1h' AFTER operating_mode,
  ADD COLUMN IF NOT EXISTS featured_until DATETIME NULL AFTER response_window,
  ADD COLUMN IF NOT EXISTS featured_rank INT NULL AFTER featured_until,
  ADD COLUMN IF NOT EXISTS featured_city_slug VARCHAR(80) NULL AFTER featured_rank,
  ADD COLUMN IF NOT EXISTS featured_category_slug VARCHAR(80) NULL AFTER featured_city_slug,
  ADD COLUMN IF NOT EXISTS featured_copy TEXT NULL AFTER featured_category_slug;

UPDATE business_profiles
SET slug = CONCAT(
  LOWER(REPLACE(REPLACE(TRIM(business_name), ' ', '-'), '''', '')),
  '-',
  RIGHT(id, 6)
)
WHERE slug = '';

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
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_hours (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  business_id VARCHAR(36) NOT NULL,
  day_of_week INT NOT NULL,
  open_time VARCHAR(5) NOT NULL,
  close_time VARCHAR(5) NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  breaks JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_business_hours_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
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
    ON DELETE RESTRICT
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
    ON DELETE CASCADE
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
    ON DELETE CASCADE
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
    ON DELETE CASCADE
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
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
