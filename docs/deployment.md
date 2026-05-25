# Deployment

## Prerequisites

- Node.js 22+
- MySQL 8+
- Production `BETTER_AUTH_SECRET` with at least 32 random characters
- Environment variables from [.env.example](/D:/barber/.env.example)

## Build and start

```bash
npm ci
npm run db:migrate
npm run build
npm run start
```

## Required runtime configuration

- `APP_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- database credentials

Optional provider configuration:

- Resend for email
- Twilio for SMS
- external media storage provider env vars when implemented

## Health checks

- Liveness: `/api/health`
- Readiness: `/api/ready`

Use readiness for deployment gates because it checks database connectivity.

## Post-deploy smoke flow

1. Verify `/api/health`
2. Verify `/api/ready`
3. Open home, explore, a business profile, and the booking page
4. Sign in with a seeded or admin-created Better Auth account
5. Create and cancel a booking
6. Verify admin/business dashboards still load

## Scheduled tasks

Required today:

- `npm run bookings:expire-pending`

Recommended later:

- reminder dispatch worker
- cleanup for expired OTP artifacts
- backup verification job

## Rollback guidance

- Roll back the app build first if a release is bad
- Roll back schema only with reviewed SQL; do not improvise destructive reversions
- Restore from backups if data-level corruption occurs
