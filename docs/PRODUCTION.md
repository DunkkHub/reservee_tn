# Production Readiness

This project is production-closer after the Better Auth integration, but deployment still depends on real infrastructure, provider credentials, monitoring, and operational ownership.

Target production stack:

- Domain: `reserveetn.app` from Name.com, with `www.reserveetn.app` supported.
- Hosting: Vercel Hobby.
- Database: Aiven MySQL free tier.
- Auth: Better Auth.
- Optional future media storage: Supabase Storage or Vercel Blob.

## Deployment Checklist

- Provision MySQL 8 with automated backups and restricted network access.
- Set all required environment variables in the hosting platform.
- Run `npm ci`.
- Run `npm run db:migrate`.
- Run `npm run build`.
- Create the first admin with `npm run auth:create-admin`.
- Start the app with `npm run start`.
- Schedule `npm run bookings:expire-pending`.
- Run smoke/manual checks before opening traffic.

## Required Environment

- `NODE_ENV=production`
- `APP_URL=https://reserveetn.app`
- `NEXT_PUBLIC_APP_URL=https://reserveetn.app`
- `BETTER_AUTH_URL=https://reserveetn.app`
- `BETTER_AUTH_SECRET=<strong stable secret>`
- `DATABASE_URL=mysql://user:password@host:port/database` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL=true` for Aiven if SSL is required or recommended
- `DB_SSL_CA=<Aiven CA certificate text or local path when running scripts locally>` if Aiven provides a CA certificate

`https://www.reserveetn.app` is also a trusted origin, but the non-`www` URL should be the canonical `APP_URL`, `NEXT_PUBLIC_APP_URL`, and `BETTER_AUTH_URL` unless the deployment deliberately switches canonical domains.

Optional production providers:

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_FROM_PHONE`
- Media storage variables if moving away from local upload paths

## Database Notes

- The app reuses one MySQL pool through `src/lib/db.ts`.
- Better Auth uses `app_users` as the auth user model and stores credential hashes in `account.password`.
- Aiven MySQL is the production database target; XAMPP is local-only and cannot be reached from Vercel.
- Run migrations before deploying code that expects Better Auth tables.
- Migration SQL does not hardcode `USE reservee_tn`; it runs against the database selected by `DATABASE_URL` or `DB_NAME`.
- Backups should include `app_users`, `account`, `session`, `verification`, bookings, business profiles, media metadata, and audit/activity tables.
- Do not log database URLs or credentials.

## Auth And Route Protection

Server-side page protection:

- `/account`: customer only.
- `/dashboard` and `/dashboard/*`: business/shop only.
- `/admin` and `/admin/*`: admin only.

API route classification:

- Public: marketplace/business browsing, public availability display, public booking creation, booking reference challenge/verify, health/readiness.
- Authenticated: `/api/auth/me`, customer booking/account lookups, single booking access by owner/customer/admin.
- Business/admin: services writes, availability writes, gallery/media writes, business settings writes, activity and waitlist dashboard reads.
- Admin: moderation under `/api/admin/*` and booking maintenance.

## Security Checklist

- Better Auth HTTP-only cookies are used for sessions.
- Production uses secure cookies through `NODE_ENV=production`.
- Public admin creation is blocked; use `npm run auth:create-admin`.
- Auth/register/profile inputs are validated with Zod or Better Auth hooks.
- Passwords are never stored in plaintext.
- Do not reuse any Better Auth secret that was pasted into chat or shared outside the deployment platform.
- Legacy auth localStorage keys are cleared on logout.
- Sensitive custom endpoints use origin checks and rate limiting.
- Security headers are configured in `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Add external monitoring, alerting, WAF/CDN rules, and log retention in the deployment platform.

## Manual Test Checklist

Authentication:

- Register customer.
- Login customer.
- Logout customer.
- Wrong password fails.
- Session persists on refresh.
- Expired session redirects to `/login`.

Roles:

- Customer cannot access `/dashboard`.
- Customer cannot access `/admin`.
- Business/shop can access `/dashboard`.
- Business/shop cannot access `/admin`.
- Admin can access `/admin`.

Booking:

- Public browsing works.
- Business page works.
- Booking flow still works.
- Manage booking reference flow still works.

Dashboard:

- Business can update services.
- Business can update availability.
- Business can view relevant bookings.
- Business cannot manage another business.

Admin:

- Admin can access moderation.
- Non-admin gets 403 or redirect.

Build:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit`

Deployment docs:

- Vercel deployment: [docs/VERCEL_DEPLOYMENT.md](/D:/barber/docs/VERCEL_DEPLOYMENT.md)
- Aiven MySQL: [docs/AIVEN_MYSQL.md](/D:/barber/docs/AIVEN_MYSQL.md)
- Media storage options: [docs/MEDIA_STORAGE.md](/D:/barber/docs/MEDIA_STORAGE.md)

## Known Limitations

- No payment/deposit workflow is implemented.
- Real SMS/email delivery requires Twilio/Resend setup.
- Media uploads are still not a full cloud binary upload pipeline.
- No browser E2E suite beyond smoke/manual checks.
- No built-in infrastructure for backups, metrics, tracing, or alerting.
- `npm audit` still reports a moderate PostCSS advisory through the installed Next.js package; npm currently suggests a breaking Next downgrade, so this should be monitored and fixed through a safe Next.js patch release rather than `npm audit fix --force`.
- Legal/privacy documents and data-retention policy still need product/legal review.
