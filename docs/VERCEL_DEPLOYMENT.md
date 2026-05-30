# Vercel Deployment

Reservee TN's production target is:

- Domain: `reserveetn.app` from Name.com, with `www.reserveetn.app` also supported.
- Hosting: Vercel Hobby.
- Database: Aiven MySQL free tier.
- Authentication: Better Auth with MySQL-backed sessions.

Do not use XAMPP in production. XAMPP is only for local development.

## 1. Import From GitHub

In Vercel, create a new project:

- GitHub repository: `DunkkHub/reservee_tn`
- Branch: `main`
- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave empty/default
- Root Directory: leave default unless `package.json` is moved

## 2. Add Environment Variables

Add these in Vercel Project Settings > Environment Variables, in the **Production** environment. Use a newly generated production secret; do not reuse any secret that was pasted into chat or committed anywhere.

```env
BETTER_AUTH_URL=https://reserveetn.app
BETTER_AUTH_SECRET=replace_with_new_secure_production_secret
APP_URL=https://reserveetn.app
NEXT_PUBLIC_APP_URL=https://reserveetn.app

DB_HOST=your-aiven-mysql-host
DB_PORT=your-aiven-mysql-port
DB_USER=your-aiven-mysql-user
DB_PASSWORD=your-aiven-mysql-password
DB_NAME=your-aiven-mysql-database
DATABASE_URL=mysql://your-aiven-mysql-user:your-aiven-mysql-password@your-aiven-mysql-host:your-aiven-mysql-port/your-aiven-mysql-database?ssl-mode=REQUIRED
DB_SSL=true
DB_SSL_CA=

ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_NAME=Reservee Admin
ADMIN_PHONE=+21600000000
```

**Important:** Include `?ssl-mode=REQUIRED` in the DATABASE_URL. Aiven MySQL requires SSL.

If your Aiven password contains special URL characters, URL-encode it in `DATABASE_URL`. Never expose database passwords in logs or error messages.

## 3. Add Domains On Vercel

Add both domains in Vercel Project Settings > Domains:

- `reserveetn.app`
- `www.reserveetn.app`

Choose `https://reserveetn.app` as the canonical app URL unless you deliberately decide to make `www` canonical later.

## 4. Configure Name.com DNS

Vercel will show the exact DNS records to add. Copy exactly what Vercel shows.

Common Vercel records are:

- Apex/root domain `@`: `A` record to `76.76.21.21`
- `www`: `CNAME` record to `cname.vercel-dns.com` or the project-specific CNAME Vercel shows

Vercel's current domain setup docs say the general-purpose values are `76.76.21.21` for apex domains and `cname.vercel-dns-0.com` for subdomains, but project-specific values may be shown. The Vercel UI is the source of truth.

## 5. Run Database Setup

Aiven must be initialized **before** deploying to Vercel. Do this from your local machine or a secure shell with network access to Aiven:

1. Create `.env.local` with Aiven credentials (do not commit this file)
2. Test the connection:

```bash
npm run db:check
```

Expected: Shows database host, port, name, and SSL status.

3. Run migrations:

```bash
npm run db:migrate
```

4. Verify migrations created tables:

```bash
npm run db:check
```

Expected: All required tables are listed.

5. Create admin user:

```bash
npm run auth:create-admin
```

6. Restore `.env.local` to XAMPP/local values if you still use local development

After local setup is complete, deploy to Vercel:

1. Verify all Aiven environment variables are set in Vercel Production settings
2. Redeploy Vercel (push to main or click Redeploy)
3. Test the API:

```bash
curl https://reserveetn.app/api/businesses?scope=public&limit=1
```

Expected: JSON response, NOT "The MySQL backend is not ready yet."

## 6. Redeploy

After setting environment variables and DNS, trigger a new production deploy in Vercel. Builds created before env vars were added may fail or use incomplete configuration.

## 7. Production Smoke Checks

Open and test:

- `https://reserveetn.app`
- `https://www.reserveetn.app`
- `https://reserveetn.app/login`
- `https://reserveetn.app/register`
- `https://reserveetn.app/account`
- `https://reserveetn.app/dashboard`
- `https://reserveetn.app/admin`

Expected access behavior:

- Logged-out users redirect from private pages to `/login`.
- Customers can access `/account`.
- Business/shop users can access `/dashboard`.
- Admins can access `/admin`.

## References

- Vercel custom domain setup: https://vercel.com/docs/domains/set-up-custom-domain
- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
