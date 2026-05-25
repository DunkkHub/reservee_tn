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

Set these in Vercel:

```env
DB_HOST=your-aiven-mysql-host
DB_PORT=your-aiven-mysql-port
DB_USER=your-aiven-mysql-user
DB_PASSWORD=your-aiven-mysql-password
DB_NAME=your-aiven-mysql-database
DATABASE_URL=mysql://your-aiven-mysql-user:your-aiven-mysql-password@your-aiven-mysql-host:your-aiven-mysql-port/your-aiven-mysql-database
DB_SSL=true
DB_SSL_CA=
```

If you use `DB_SSL_CA`, it can be either the CA certificate text or a local file path when running commands locally. In Vercel, paste the certificate text and preserve newlines if possible. Escaped `\n` newlines are also supported.

## 4. Run Migrations From Local Machine

To initialize Aiven from your local machine:

1. Temporarily put Aiven values in `.env.local`.
2. Run:

```bash
npm run db:migrate
npm run auth:create-admin
```

3. Run smoke checks if you want the seeded test flow against the currently configured database. Do this only before real customer data exists or against a staging clone because the smoke flow reseeds development data:

```bash
npm run smoke
```

4. Restore `.env.local` to XAMPP/local values if you still use local development.

The migration runner connects to the database configured by `DB_NAME` or `DATABASE_URL`. SQL migration files do not hardcode `USE reservee_tn`, so the same migrations can run against an Aiven database with any name.

## 5. Admin Creation

The admin script reads:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `ADMIN_PHONE`

It creates or updates the `app_users` admin row and the Better Auth credential record in `account`. It does not print the password and does not hardcode production credentials.

Example:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD="StrongPassword123!" ADMIN_NAME="Reservee Admin" ADMIN_PHONE="+21600000000" npm run auth:create-admin
```

## 6. Local Development Reminder

For XAMPP local development, use local values:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=reservee_tn
DATABASE_URL=mysql://root:@127.0.0.1:3306/reservee_tn
DB_SSL=false
```

Do not put XAMPP values in Vercel production.

## References

- Aiven MySQL getting started: https://aiven.io/docs/products/mysql/get-started
- Aiven TLS/SSL certificates: https://aiven.io/docs/platform/concepts/tls-ssl-certificates
