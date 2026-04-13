# XAMPP + phpMyAdmin Setup

## Purpose

This project now includes a real MySQL-backed authentication layer for:

- customer accounts
- shop accounts
- admin sign-in

It also now stores core operational state in MySQL:

- public businesses
- services
- availability
- bookings
- gallery/media
- waitlist requests
- moderation history
- activity logs

## Local defaults

The local app is configured around standard XAMPP defaults:

- host: `127.0.0.1`
- port: `3306`
- user: `root`
- password: empty
- database: `reservee_tn`

These values are already written into `.env.local`.

## Import the database

1. Start `Apache` and `MySQL` in XAMPP.
2. Open phpMyAdmin.
3. Click `Import`.
4. Choose [database/reservee_tn.sql](/D:/barber/database/reservee_tn.sql).
5. Run the import.

This creates:

- `app_users`
- `business_profiles`
- `services`
- `business_hours`
- `bookings`
- `blocked_slots`
- `media_items`
- `moderation_history`
- `waitlist_requests`

It also inserts one local admin account.

## If your local database is older

If you created `reservee_tn` before the newer backend API tables were added, also import:

- [database/migrations/2026-04-13-sync-backend-schema.sql](/D:/barber/database/migrations/2026-04-13-sync-backend-schema.sql)
- [database/migrations/2026-04-13-production-state-foundation.sql](/D:/barber/database/migrations/2026-04-13-production-state-foundation.sql)

That upgrades older local schemas with the newer business trust/policy fields, activity log table, and waitlist date/time columns.

## Fast local setup

If you want the repo to prepare the schema and sample marketplace data for you, run:

```bash
npm run db:seed-dev
```

That command:

- applies the base schema
- applies the local migrations
- seeds repeatable live businesses like `atlas-barber-club`
- seeds services, hours, media, moderation history, and activity logs for local testing

## Default admin login

- email: `admin@reservee.tn`
- password: `admin12345`

Change that password immediately in any real deployment.

## Registering normal users

After the SQL import:

1. Open `/register`.
2. Choose `Customer` or `Shop`.
3. Submit the form.
4. The account is stored in MySQL.
5. The session cookie redirects the user to the correct area:
   - customer -> `/account`
   - shop -> `/dashboard`
   - admin -> `/admin`

## What is separated now

- Customers cannot open `/dashboard` or `/admin`.
- Shop users cannot open `/account` unless their role changes.
- Admin routes require an admin account.
- Public navigation shows different entry points based on the logged-in role.

## Current limitation

The main remaining infra gap is not browser storage anymore. It is production hardening:

- OTP and rate-limit state are still in memory
- XAMPP-style local defaults are still present for development
- media upload still uses URL-based placeholder input instead of signed file upload
