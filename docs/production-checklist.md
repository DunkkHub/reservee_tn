# Production Checklist

## Code quality

- Done: `lint`, `typecheck`, `test`, `build`, and seeded smoke commands exist and pass locally.
- Partially done: API contracts are more consistent, but not every route has the same depth of validation/refactoring yet.

## Tests

- Done: unit coverage exists for passwords, session signing, validation, availability, role checks, lifecycle rules, and health.
- Partially done: smoke tests cover critical flows, but there is no browser E2E suite or route-by-route integration harness yet.

## Security

- Done: signed cookies, origin checks, rate limits, OTP verification, stronger passwords, and safer error envelopes are in place.
- Partially done: no CAPTCHA, advanced lockout policy, or external security monitoring yet.

## Database

- Done: repeatable migrations, seed flow, booking lifecycle alignment migration, and useful indexes were added.
- Partially done: migration history is SQL-based and lightweight, not backed by a richer migration framework.

## Auth

- Done: stronger password policy, OTP login, password reset challenge flow, revocable server-side sessions.
- Partially done: no automated secret rotation or multi-factor enrollment UX beyond OTP challenge flows.

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
