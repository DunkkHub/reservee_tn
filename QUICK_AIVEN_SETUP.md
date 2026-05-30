# Quick Start - Aiven Migration Commands

**Run these commands on a machine with network access to Aiven MySQL:**

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Test connection to Aiven
npm run db:check

# 3. Apply all migrations to Aiven (creates tables)
npm run db:migrate

# 4. Verify all tables were created
npm run db:check

# 5. Create admin user in Aiven
npm run auth:create-admin

# 6. Confirm everything is ready
npm run db:check
```

## Expected Results

| Command | Expected Output |
|---------|-----------------|
| `npm run db:check` (before migrate) | ✓ Connection successful, ✗ tables missing |
| `npm run db:migrate` | Applied migration: ... (6 migrations total) |
| `npm run db:check` (after migrate) | ✓ All required tables exist |
| `npm run auth:create-admin` | Admin user created/updated successfully |

## After Aiven Is Ready

1. Open Vercel > Project Settings > Environment Variables > **Production**
2. Add all Aiven env vars from `.env.local`
3. Redeploy Vercel
4. Test: `curl https://www.reserveetn.app/api/businesses?scope=public&limit=1`

See `AIVEN_MIGRATION_INSTRUCTIONS.md` for detailed troubleshooting.
