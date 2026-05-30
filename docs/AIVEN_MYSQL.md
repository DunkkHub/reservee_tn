# Aiven MySQL

Reservee TN uses MySQL in production. The target hosted database is Aiven MySQL free tier.

XAMPP is local-only. Vercel cannot connect to `127.0.0.1`, `localhost`, or your XAMPP MySQL server.

## 1. Create The Service

1. Create or sign in to an Aiven account.
2. Create a new MySQL service.
3. Choose the free tier if it is available for your account and region.
4. Wait until the service status is running.

Aiven's free tier may not allow selecting a specific cloud provider or region.

## 2. Copy Connection Values

From the Aiven service overview, copy:

- Host
- Port
- User
- Password
- Database name
- CA certificate, if Aiven shows or requires one for your service

Aiven documents that traffic to Aiven services is protected by TLS. If your service provides a CA certificate, download it and use it for verified SSL connections.

## 3. Add Vercel Environment Variables

Set these in Vercel **Production** environment:

```env
DB_HOST=your-aiven-mysql-host
DB_PORT=your-aiven-mysql-port
DB_USER=your-aiven-mysql-user
DB_PASSWORD=your-aiven-mysql-password
DB_NAME=your-aiven-mysql-database
DATABASE_URL=mysql://your-aiven-mysql-user:your-aiven-mysql-password@your-aiven-mysql-host:your-aiven-mysql-port/your-aiven-mysql-database?ssl-mode=REQUIRED
DB_SSL=true
```

**Important:** Include `?ssl-mode=REQUIRED` in the DATABASE_URL. Aiven MySQL requires SSL connections.

If Aiven provides a CA certificate and you want strict verification, set `DB_SSL_CA`:
- Locally: Use the file path or certificate text (escaped newlines with `\n`)
- In Vercel: Paste the certificate text directly

**Note:** If `DB_SSL_CA` is not provided, SSL connections will use system CA certificates for Aiven's standard certificates.

## 4. Test Connection Locally

Before running migrations on Aiven, verify the connection:

1. Put Aiven values in `.env.local`
2. Run the diagnostic:

```bash
npm run db:check
```

Expected output:
- Shows database host, port, name, and SSL status
- Displays connected tables
- Shows missing tables (OK before first migration)
- Exits with success if database is reachable

## 5. Run Migrations From Local Machine

To initialize Aiven schema from your local machine:

1. Verify `.env.local` contains Aiven values
2. Run `npm run db:check` to verify connection
3. Run migrations:

3. Run migrations:

```bash
npm run db:migrate
```

4. Verify schema was created:

```bash
npm run db:check
```

Expected: All required tables now exist.

5. Create admin user:

```bash
npm run auth:create-admin
```

The admin script reads from environment variables:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `ADMIN_PHONE`

It creates or updates the admin user and Better Auth credential record in the account table.

## 6. Run Smoke Tests (Optional)

To verify the system against Aiven:

```bash
npm run smoke
```

**Warning:** The smoke test will seed development data. Only run this before real customer data exists or against a staging clone.

## 7. Restore Local Development Environment

If you still use XAMPP for local development, restore `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=reservee_tn
DATABASE_URL=mysql://root:@127.0.0.1:3306/reservee_tn
DB_SSL=false
```

## 8. Deploy to Vercel

After Aiven is initialized and migrations are applied:

1. Verify all Aiven env vars are set in Vercel **Production** settings
2. Redeploy Vercel:
   - Push to the production branch, or
   - Click "Redeploy" in Vercel dashboard
3. Verify the API is responsive:

```bash
curl https://reserveetn.app/api/businesses?scope=public&limit=1
```

Expected: JSON response with businesses (or empty list), NOT an error about MySQL not being ready.

## Technical Details

### Database Configuration

- Migrations use the value of `DB_NAME` or parse it from `DATABASE_URL`
- Migration SQL files do not hardcode `USE reservee_tn`, so they work with any database name
- SSL is recommended for Aiven; use `DB_SSL=true` and `?ssl-mode=REQUIRED` in DATABASE_URL

### SSL Behavior

- If `DB_SSL_CA` is provided: mysql2 will verify against that certificate
- If `DB_SSL_CA` is not provided: mysql2 will verify using system CA certificates (works for Aiven)
- If `DB_SSL=false`: No SSL (only for local XAMPP)

### Environment Variables

Do not commit `.env.local`. Use it only for temporary testing against Aiven locally.

## References

- Aiven MySQL getting started: https://aiven.io/docs/products/mysql/get-started
- Aiven TLS/SSL certificates: https://aiven.io/docs/platform/concepts/tls-ssl-certificates
