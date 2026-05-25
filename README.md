# Reservee TN

Reservee TN is a Tunisia-focused beauty booking platform built for barbers, hair salons, beauty centers, nail studios, and spas.

This repository is no longer just a visual demo. It now includes a stricter booking lifecycle, Better Auth sessions, role-aware dashboard protections, structured notification/media abstractions, repeatable database seeding, smoke checks, and CI.

## Current status

What works now:

- Public marketplace pages for discovery, business profiles, and booking
- Customer account and booking self-service flows
- Shop dashboard flows for bookings, services, availability, gallery, and settings
- Admin moderation surface
- Better Auth email/password sign-in with MySQL-backed users, sessions, bookings, business data, moderation history, waitlist, and activity logs
- Server-side role guards for customers, shop owners, and admins
- Booking-reference verification with rate limiting
- Booking expiry script and health/readiness endpoints
- Unit and smoke test foundations with CI

What is still dev- or setup-dependent:

- Real SMS delivery requires Twilio configuration
- Real email delivery requires Resend configuration
- Media upload is still URL/metadata driven; direct binary upload is not fully implemented
- Scheduled expiry/reminder jobs must be wired by the deployer
- Monitoring, alerting, and backup automation must be provided by infrastructure

## Stack

- Next.js App Router
- TypeScript
- React 19
- Tailwind CSS 4
- MySQL 8
- Zod validation
- Node test runner + `tsx`

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Seed a local database:

```bash
npm run db:seed-dev
```

4. Start development:

```bash
npm run dev
```

## Required environment variables

The full reference is in [.env.example](/D:/barber/.env.example), but the minimum local set is:

- `APP_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL` / `DB_SSL_CA` when using a hosted MySQL provider that requires SSL

Optional provider configuration:

- `NOTIFICATION_EMAIL_PROVIDER`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `NOTIFICATION_SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_FROM_PHONE`
- `MEDIA_STORAGE_PROVIDER`, `MEDIA_LOCAL_UPLOAD_DIR`, `MEDIA_PUBLIC_BASE_PATH`, `MEDIA_UPLOAD_MAX_BYTES`

## Database and seed

- Base schema: [database/reservee_tn.sql](/D:/barber/database/reservee_tn.sql)
- SQL migrations: [database/migrations](/D:/barber/database/migrations)
- Local seed: `npm run db:seed-dev`
- First admin seed: `npm run auth:create-admin`
- Pending-booking expiry job: `npm run bookings:expire-pending`

The seed is repeatable. It uses generated or environment-provided local passwords instead of committed fixed credentials.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:smoke
```

Useful extras:

- `npm run test:watch`
- `npm run db:migrate`
- `npm run db:reset-dev`

## Production deployment

Production stack:

- Domain: `reserveetn.app` from Name.com, with `www.reserveetn.app` supported
- Hosting: Vercel Hobby
- Database: Aiven MySQL free tier
- Auth: Better Auth
- Optional future media storage: Supabase Storage or Vercel Blob

High-level deployment flow:

1. Provision MySQL 8 and backups.
2. Set production env vars from [.env.example](/D:/barber/.env.example).
3. Run `npm ci`.
4. Run `npm run db:migrate`.
5. Run `npm run build`.
6. Start the app with `npm run start`.
7. Wire a scheduler for `npm run bookings:expire-pending`.
8. Run the post-deploy smoke checklist from [docs/deployment.md](/D:/barber/docs/deployment.md).

## Documentation

- [Architecture](/D:/barber/docs/architecture.md)
- [Testing](/D:/barber/docs/testing.md)
- [Database](/D:/barber/docs/database.md)
- [Vercel deployment](/D:/barber/docs/VERCEL_DEPLOYMENT.md)
- [Aiven MySQL](/D:/barber/docs/AIVEN_MYSQL.md)
- [Deployment](/D:/barber/docs/deployment.md)
- [Security](/D:/barber/docs/security.md)
- [Authentication](/D:/barber/docs/AUTH.md)
- [Production readiness](/D:/barber/docs/PRODUCTION.md)
- [Production checklist](/D:/barber/docs/production-checklist.md)
- [Media storage](/D:/barber/docs/MEDIA_STORAGE.md)
- [Admin workflows](/D:/barber/docs/admin-workflows.md)
- [Media](/D:/barber/docs/media.md)
- [Technical review](/D:/barber/TECHNICAL_REVIEW.md)

## Known limitations

- No integrated payment/deposit workflow yet
- No real job queue yet
- No direct cloud media uploader yet
- No browser E2E suite yet beyond seeded smoke checks
- A few transitive `npm audit` moderate findings remain unresolved upstream or in dev tooling
