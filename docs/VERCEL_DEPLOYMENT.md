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

Add these in Vercel Project Settings > Environment Variables. Use a newly generated production secret; do not reuse any secret that was pasted into chat or committed anywhere.

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
DATABASE_URL=mysql://your-aiven-mysql-user:your-aiven-mysql-password@your-aiven-mysql-host:your-aiven-mysql-port/your-aiven-mysql-database
DB_SSL=true
DB_SSL_CA=

ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_NAME=Reservee Admin
ADMIN_PHONE=+21600000000
```

If your Aiven password contains special URL characters, URL-encode it in `DATABASE_URL`. Keep `SUPABASE_SERVICE_ROLE_KEY` out of Vercel client-exposed variables if future media storage is added.

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

After Aiven MySQL is created and env vars are available locally or in a secure shell:

```bash
npm run db:migrate
npm run auth:create-admin
```

If running from your local machine against Aiven, temporarily put the Aiven values in `.env.local`, run the commands, then restore `.env.local` to XAMPP/local values if you still need local development.

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
