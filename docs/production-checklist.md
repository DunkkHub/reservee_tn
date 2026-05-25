# Production Checklist

## Target stack

- Domain: `reserveetn.app` from Name.com, with `www.reserveetn.app` supported.
- Hosting: Vercel Hobby.
- Database: Aiven MySQL free tier.
- Auth: Better Auth.
- Optional future media storage: Supabase Storage or Vercel Blob.

## Before deploy

- Aiven MySQL service is created and reachable from your local machine.
- Vercel project is imported from `DunkkHub/reservee_tn` on `main`.
- Vercel environment variables are added for Better Auth, app URLs, Aiven MySQL, and first-admin creation.
- A new `BETTER_AUTH_SECRET` is generated; do not reuse any secret previously pasted into chat.
- `reserveetn.app` and `www.reserveetn.app` are added to the Vercel project.
- Name.com DNS records are configured exactly as Vercel shows.
- Migrations have been run against Aiven with `npm run db:migrate`.
- The first admin has been created with `npm run auth:create-admin`.
- `npm run build` passes.

## After deploy

- `https://reserveetn.app` opens.
- `https://www.reserveetn.app` opens or redirects according to the Vercel domain configuration.
- `/login` works.
- `/register` works.
- Logout works.
- Admin login works.
- Customer users cannot access `/admin`.
- Customer users cannot access `/dashboard`.
- Business/shop users can access `/dashboard`.
- Booking flow works.
- Smoke test passes against the production-intended database before real customer data exists, or against a staging clone. The smoke script seeds data and should not run against a live database with real bookings.
- No secrets are visible in the browser bundle.
- `.env.local` is not committed.

## Code quality

- Done: `lint`, `typecheck`, `test`, `build`, and seeded smoke commands exist and pass locally.
- Partially done: API contracts are more consistent, but not every route has the same depth of validation/refactoring yet.

## Tests

- Done: unit coverage exists for validation, availability, role checks, lifecycle rules, and health.
- Partially done: smoke tests cover critical flows, but there is no browser E2E suite or route-by-route integration harness yet.

## Security

- Done: Better Auth HTTP-only session cookies, origin checks, rate limits, OTP verification for reset/booking access, stronger passwords, and safer error envelopes are in place.
- Partially done: no CAPTCHA, advanced lockout policy, or external security monitoring yet.

## Database

- Done: repeatable migrations, seed flow, booking lifecycle alignment migration, and useful indexes were added.
- Partially done: migration history is SQL-based and lightweight, not backed by a richer migration framework.

## Auth

- Done: Better Auth email/password login, stronger password policy, password reset challenge flow, and revocable MySQL-backed sessions.
- Partially done: no automated secret rotation or multi-factor enrollment UX yet.

## Booking lifecycle

- Done: explicit statuses, conflict prevention, slot locking, expiry handling, lifecycle tests, and expiry script.
- Partially done: reminder scheduling architecture exists, but no worker is deployed here.

## Notifications

- Done: provider abstraction exists for email and SMS with console defaults.
- Partially done: production sending requires owner-supplied Resend/Twilio credentials.

## Monitoring

- Done: health and readiness endpoints exist, plus structured logging helpers.
- Not done: no metrics backend, tracing, or alerting integration is included.

## Backups

- Not done: backup automation is an infrastructure responsibility and is only documented here.

## Deployment

- Done: CI workflow exists, deployment steps are documented, and smoke validation is documented.
- Partially done: no IaC or platform-specific deployment manifests are included.

## Legal/privacy

- Not done: privacy policy, terms, cookie consent strategy, and data-retention policy still need product/legal ownership.

## Manual QA

- Done: smoke checks now cover the highest-risk user journeys.
- Partially done: device lab QA, accessibility audits, and real provider staging tests still need humans.
