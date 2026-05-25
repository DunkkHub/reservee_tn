# Security

## Current protections

- Better Auth email/password credential hashing
- Better Auth HTTP-only session cookies
- MySQL-backed Better Auth session storage and revocation
- OTP verification for password reset and public booking-reference access
- Role checks on customer, business, and admin surfaces
- Business ownership checks before dashboard mutations
- Origin validation on state-changing requests
- Route-level rate limiting on login, password reset, booking creation, and booking-reference verification
- Structured API error envelopes without raw stack traces
- Zod validation for core auth, booking, media, and moderation payloads
- Booking access tokens are short-lived and hashed in storage

## Important implementation notes

- Console notification providers are the safe default unless Twilio/Resend are configured
- Seed credentials are generated or env-provided, not fixed in source
- Local loopback alias handling now accepts `localhost`, `127.0.0.1`, and `::1` safely for dev/smoke usage

## Remaining risks

- Some API routes still need deeper normalization and broader integration coverage
- No WAF, CDN security policy, or reverse-proxy hardening is included here
- No production secret rotation workflow is automated yet
- No formal account lockout or CAPTCHA layer exists yet
- Audit logging exists, but export/alerting workflows are not built
- A few moderate `npm audit` findings remain in transitive tooling/dependencies

## Production checklist

- Set a strong unique `BETTER_AUTH_SECRET`
- Disable dev OTP previews
- Configure real email/SMS providers or accept no-op console mode
- Run behind HTTPS only
- Restrict MySQL network access
- Enable backups and restore drills
- Schedule pending-booking expiry
- Monitor auth and booking error rates
