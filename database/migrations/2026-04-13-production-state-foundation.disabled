ALTER TABLE business_profiles
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
  ADD COLUMN IF NOT EXISTS profile_views INT NOT NULL DEFAULT 0 AFTER policy_clarity;

ALTER TABLE waitlist_requests
  ADD COLUMN IF NOT EXISTS preferred_date DATETIME NULL AFTER customer_note,
  ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(60) NOT NULL DEFAULT '' AFTER preferred_date;

CREATE TABLE IF NOT EXISTS activity_logs (
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
  summary TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_logs_business
    FOREIGN KEY (business_id)
    REFERENCES business_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE CASCADE,
  KEY idx_activity_logs_business_id (business_id),
  KEY idx_activity_logs_booking_id (booking_id),
  KEY idx_activity_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
