# Technical Review

## Original estimated score

5.8 / 10

Why:

- strong visual MVP energy, but weak production confidence
- inconsistent API contracts
- shallow tests
- hardcoded local seed credentials
- schema/runtime drift around booking statuses
- missing operational basics like readiness checks and CI

## New estimated score

8.3 / 10

## What improved

- Added consistent API response helpers and route error handling foundations
- Hardened auth flows with Zod validation, signed cookies, stronger password requirements, and safer password reset behavior
- Fixed a real logout/session revocation bug
- Added explicit booking lifecycle logic, conflict tests, expiry handling, and a pending-booking expiry script
- Added notification abstractions and wired booking creation/cancellation/confirmation hooks
- Added media storage abstractions plus metadata persistence scaffolding
- Added health/readiness endpoints, global error UI, and not-found handling
- Expanded tests materially and added seeded smoke coverage
- Added CI with MySQL-backed validation
- Rewrote environment and ops documentation to match the actual code
- Removed committed fixed local seed passwords
- Patched Next.js from `16.2.3` to `16.2.6`

## What still blocks a true 9/10

- No real background worker or queue for reminders, retries, and cleanup beyond scripts
- No direct production-grade binary upload pipeline yet
- No payments/deposits flow
- Not every API route has been refactored to the same validation depth
- Observability stops at logs and probe endpoints; there is no metrics/tracing stack
- Legal/privacy and retention requirements are not implemented in-app

## What still requires human setup

- production MySQL provisioning and backups
- real `AUTH_SECRET`
- Twilio credentials for SMS
- Resend credentials for email
- chosen media storage provider and upload flow
- cron or scheduler for `npm run bookings:expire-pending`
- deployment platform configuration

## Commands run and results

- `npm install`: passed
- `npm install next@16.2.6 eslint-config-next@16.2.6`: passed
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: passed
- `npm run build`: passed
- `npm run test:smoke`: passed
- `npm audit --json`: remaining 3 moderate vulnerabilities in transitive/dependency tooling

## Known risks

- Remaining moderate `npm audit` findings are still open upstream/transitively
- Operational reminders and cleanup depend on external scheduling
- Media handling is metadata-first, not a finished upload pipeline
- Route consistency is improved but not uniform across every endpoint yet

## Next 10 priorities

1. Add a real job runner for reminders and retryable notifications.
2. Finish route-by-route normalization for every remaining API endpoint.
3. Add direct upload support for S3/R2/Cloudinary with signed URLs.
4. Add admin audit export and suspicious-auth monitoring.
5. Add Playwright browser E2E coverage.
6. Add metrics and tracing.
7. Add database restore drill automation.
8. Add staged provider integration tests for Twilio and Resend.
9. Add privacy/terms/data-retention product surfaces.
10. Add deposit/payment architecture if the business model needs it.
