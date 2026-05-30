ALTER TABLE business_profiles
  ADD KEY idx_business_profiles_status_city_category (status, city_slug, category_slug);

ALTER TABLE bookings
  ADD KEY idx_bookings_business_status_window (business_id, status, start_at, end_at),
  ADD KEY idx_bookings_customer_phone_raw (customer_phone);

ALTER TABLE services
  ADD KEY idx_services_business_active_sort (business_id, active, sort_order);

ALTER TABLE waitlist_requests
  ADD KEY idx_waitlist_business_status_created_at (business_id, status, created_at);

ALTER TABLE activity_logs
  ADD KEY idx_activity_logs_business_created_at (business_id, created_at);
