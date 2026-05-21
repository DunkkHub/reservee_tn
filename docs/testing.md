# Testing

## Test layers

### Unit tests

Current unit coverage includes:

- password hashing and verification
- session token signing, tamper detection, and expiry
- slot availability logic
- booking conflict detection
- booking status transitions
- role/access-control helpers
- input validation
- health route payload shape

Run them with:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

## Smoke tests

The smoke flow is seeded and end-to-end at the HTTP level. It covers:

- public routes
- protected redirects
- OTP login for customer, business owner, and admin
- session lookup
- admin access control
- public business loading
- next available slot lookup
- booking creation
- double-booking rejection
- invalid/past slot rejection
- cancellation and slot release
- booking reference OTP verification
- logout

Run it after a production build:

```bash
npm run build
npm run test:smoke
```

## Prerequisites

For any test that touches the database or seeded smoke flow:

- MySQL must be reachable
- `.env.local` or equivalent env vars must be set
- `npm run db:seed-dev` must succeed

## Recommended validation sequence

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:smoke
```

## Current gaps

- No Playwright browser suite yet
- No database-isolated integration harness for every API route yet
- No load or soak testing yet
