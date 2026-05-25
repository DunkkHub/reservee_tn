# Media Storage

No production media storage migration is required before the first Vercel deployment unless the app needs real uploaded images immediately.

## Current State

Reservee TN currently stores media metadata and supports local/external URL style media records. Keep this path for initial deployment.

## Future Options

Recommended future storage options:

- Supabase Storage free tier
- Vercel Blob

Supabase may be used later for files/images only. Do not add Supabase Auth, Supabase session middleware, or Supabase database replacement for this project.

## Rules

- Better Auth remains the only real auth/session system.
- MySQL remains the application database.
- Do not replace MySQL with Supabase/Postgres.
- Do not copy Supabase quickstart `page.tsx` examples into the app.
- Do not add Supabase auth middleware.

## Allowed Future Env Vars

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` can be public only if storage policies are correct. `SUPABASE_SERVICE_ROLE_KEY` must stay server-only and must never be imported into client components.

Never commit `.env.local` or real production keys.
