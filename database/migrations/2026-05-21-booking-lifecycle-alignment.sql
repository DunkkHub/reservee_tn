ALTER TABLE bookings
  MODIFY COLUMN status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'cancelled_by_customer',
    'cancelled_by_business',
    'rejected',
    'completed',
    'no_show',
    'expired'
  ) NOT NULL DEFAULT 'pending';

ALTER TABLE booking_events
  MODIFY COLUMN previous_status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'cancelled_by_customer',
    'cancelled_by_business',
    'rejected',
    'completed',
    'no_show',
    'expired'
  ) NULL,
  MODIFY COLUMN next_status ENUM(
    'pending',
    'confirmed',
    'cancelled',
    'cancelled_by_customer',
    'cancelled_by_business',
    'rejected',
    'completed',
    'no_show',
    'expired'
  ) NULL;

UPDATE bookings b
LEFT JOIN (
  SELECT
    booking_id,
    MAX(CASE WHEN reason = 'cancelled_by_customer' THEN 1 ELSE 0 END) AS cancelled_by_customer_reason,
    MAX(CASE WHEN actor_role = 'customer' AND event_type = 'status_changed' THEN 1 ELSE 0 END) AS customer_status_change
  FROM booking_events
  GROUP BY booking_id
) e ON e.booking_id = b.id
SET b.status = CASE
  WHEN b.status = 'rejected' THEN 'cancelled_by_business'
  WHEN b.status = 'cancelled' AND (e.cancelled_by_customer_reason = 1 OR e.customer_status_change = 1) THEN 'cancelled_by_customer'
  WHEN b.status = 'cancelled' THEN 'cancelled_by_business'
  ELSE b.status
END
WHERE b.status IN ('cancelled', 'rejected');

UPDATE booking_events
SET previous_status = CASE
  WHEN previous_status = 'rejected' THEN 'cancelled_by_business'
  WHEN previous_status = 'cancelled' AND (reason = 'cancelled_by_customer' OR actor_role = 'customer') THEN 'cancelled_by_customer'
  WHEN previous_status = 'cancelled' THEN 'cancelled_by_business'
  ELSE previous_status
END
WHERE previous_status IN ('cancelled', 'rejected');

UPDATE booking_events
SET next_status = CASE
  WHEN next_status = 'rejected' THEN 'cancelled_by_business'
  WHEN next_status = 'cancelled' AND (reason = 'cancelled_by_customer' OR actor_role = 'customer') THEN 'cancelled_by_customer'
  WHEN next_status = 'cancelled' THEN 'cancelled_by_business'
  ELSE next_status
END
WHERE next_status IN ('cancelled', 'rejected');

ALTER TABLE bookings
  MODIFY COLUMN status ENUM(
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
  ) NOT NULL DEFAULT 'pending',
  ADD KEY IF NOT EXISTS idx_bookings_business_status_start_at (business_id, status, start_at);

ALTER TABLE booking_events
  MODIFY COLUMN previous_status ENUM(
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
  ) NULL,
  MODIFY COLUMN next_status ENUM(
    'pending',
    'confirmed',
    'cancelled_by_customer',
    'cancelled_by_business',
    'completed',
    'no_show',
    'expired'
  ) NULL;

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(32) NOT NULL DEFAULT 'external_url' AFTER alt,
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255) NULL AFTER storage_provider,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120) NULL AFTER storage_key,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NULL AFTER mime_type,
  ADD KEY IF NOT EXISTS idx_media_items_business_type_sort (business_id, type, sort_order);

UPDATE media_items
SET storage_provider = CASE
  WHEN url LIKE 'http%' THEN 'external_url'
  ELSE 'local'
END
WHERE storage_provider IS NULL OR storage_provider = '';
