# Authentication

Reservee TN uses Better Auth for email/password authentication and keeps the existing MySQL-backed app profile model.

## Environment Variables

Required locally and in production:

- `BETTER_AUTH_URL`: Canonical app URL, for example `http://localhost:3000` locally or `https://reserveetn.app` in production.
- `BETTER_AUTH_SECRET`: Strong random secret with at least 32 characters. Never commit the real value.
- `DATABASE_URL`: Optional MySQL connection URL.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Existing MySQL variables used when `DATABASE_URL` is empty.
- `APP_URL` and `NEXT_PUBLIC_APP_URL`: Existing app URL values used by the app and allowed-origin checks.

No secret uses a `NEXT_PUBLIC_` prefix. Client components import only `src/lib/auth-client.ts`, not server env validation.

## Database

Run the normal migration flow:

```bash
npm run db:migrate
```

The Better Auth migration adds:

- `email_verified` and `image` to `app_users`.
- A nullable `password_hash` legacy column so Better Auth can store credential hashes in `account.password`.
- Better Auth `session`, `account`, and `verification` tables.

No existing Reservee TN marketplace, booking, dashboard, or moderation tables are dropped.

Reservee TN keeps reviewed SQL migrations in `database/migrations` as the canonical schema source. Better Auth CLI migrations are not exposed as npm scripts because the current CLI dependency adds avoidable audit risk for this app; use committed SQL migrations for production changes.

## Role Model

Better Auth owns the authentication identity. Reservee TN still owns app role/profile data in MySQL.

- `app_users.role = "customer"` redirects to `/account`.
- `app_users.role = "shop"` is the existing business-owner role and redirects to `/dashboard`.
- `app_users.role = "admin"` redirects to `/admin`.

The product-facing "business" role maps to the existing `shop` database role. Public registration can create `customer` and `shop` users only. Admin users must be created through the admin seed script or direct trusted operations.

Server-side guards live in `src/lib/auth-guards.ts` and are used by the private layouts:

- `/account`: customer only.
- `/dashboard` and nested dashboard routes: shop/business only.
- `/admin` and nested admin routes: admin only.

## Create The First Admin

Use environment variables:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPassword!123' ADMIN_NAME='Reservee Admin' ADMIN_PHONE='+216 20 000 001' npm run auth:create-admin
```

Or CLI flags:

```bash
npm run auth:create-admin -- --email=admin@example.com --password='StrongPassword!123' --name='Reservee Admin' --phone='+216 20 000 001'
```

The script upserts the `app_users` admin profile and Better Auth credential account. It never prints the password.

`ADMIN_PHONE` is also supported because the existing Reservee TN `app_users` schema requires a phone number.

## Local Testing

For seeded local accounts:

```bash
npm run db:seed-dev
npm run dev
```

Then sign in at `/login` using the seed output credentials. Customer users land on `/account`, shop users land on `/dashboard`, and admins land on `/admin`.

`GET /api/auth/me` returns a safe current-user DTO with `id`, `email`, `name`, and `role` for client-side redirects or status checks. It does not return secrets, password hashes, session tokens, or admin-only data.

Logout uses Better Auth `signOut()` and clears old localStorage auth keys from earlier demo implementations. Remaining localStorage/sessionStorage usage is limited to locale preference and development PWA reload state, not authentication.

## Production Notes

- Set `BETTER_AUTH_URL` to the final HTTPS origin exactly.
- The production origins are `https://reserveetn.app` and `https://www.reserveetn.app`; use the canonical domain for `BETTER_AUTH_URL`.
- Generate `BETTER_AUTH_SECRET` with a secure random source and keep it stable across deploys.
- Use HTTPS in production so Better Auth can use secure cookies.
- Run `npm run db:migrate` before deploying code that depends on Better Auth tables.
