# Database

## Current model

The project uses MySQL with:

- a bootstrap schema in [database/reservee_tn.sql](/D:/barber/database/reservee_tn.sql)
- ordered SQL migrations in [database/migrations](/D:/barber/database/migrations)
- a repeatable local seed in [scripts/seed-dev-db.mjs](/D:/barber/scripts/seed-dev-db.mjs)

## Key tables

- `app_users`: customers, business users, admins
- `account`: Better Auth provider accounts and credential password hashes
- `session`: Better Auth server-side sessions
- `verification`: Better Auth verification records
- `auth_challenges`: password reset and booking access OTP challenges
- `business_profiles`: business public and operational profile data
- `services`: bookable services
- `business_hours`: recurring availability
- `availability_exceptions`: blocked windows
- `bookings`: customer appointments
- `booking_slot_locks`: concurrency guard for active bookings
- `booking_events`: lifecycle audit trail
- `media_items`: gallery/cover metadata
- `moderation_history`: admin notes and status changes
- `activity_logs`: business/admin activity feed
- `booking_access_sessions`: short-lived public booking access tokens

`sessions` is a legacy table from the previous custom auth implementation. It is not used for user login/session authorization now that Better Auth owns app sessions.

## Booking lifecycle schema

The active booking statuses are:

- `pending`
- `confirmed`
- `cancelled_by_customer`
- `cancelled_by_business`
- `completed`
- `no_show`
- `expired`

The latest migration aligns old `cancelled` and `rejected` history into the explicit model.

## Migration process

Apply schema changes with:

```bash
npm run db:migrate
```

Notes:

- The migration runner is SQL-first and lightweight
- It is honest about the current state: this is not Prisma/Drizzle/Flyway
- New production migrations should remain additive and reversible where practical

## Seed process

Run:

```bash
npm run db:seed-dev
```

The seed:

- applies migrations first
- clears/replaces the local demo dataset
- generates or accepts local seed passwords
- creates public businesses, services, gallery records, and bookings

## Backup recommendations

Minimum production backup posture:

- daily full logical dump
- point-in-time recovery if your managed MySQL supports it
- encrypted offsite retention
- regular restore drills into a non-production environment

## Production setup recommendations

- Use a dedicated MySQL user instead of `root`
- Enforce TLS if the database is remote
- Restrict network access to application hosts only
- Monitor slow queries and connection pool saturation
- Schedule `npm run bookings:expire-pending`
