# Architecture

## Overview

Reservee TN is a single Next.js application that serves:

- Public marketplace pages
- Customer account pages
- Business dashboard pages
- Admin moderation pages
- Route handlers for all write operations

State is persisted in MySQL. The frontend talks to route handlers instead of mutating browser storage directly for operational data.

## Main domains

### Auth and sessions

- Better Auth is mounted at `/api/auth/[...all]`
- Account records live in `app_users`, mapped as the Better Auth user model
- Credential hashes are owned by Better Auth and stored in `account.password`
- Login uses Better Auth email/password
- Sessions are stored server-side in Better Auth's `session` table
- Cookies are managed by Better Auth as HTTP-only cookies and are secure in production
- Mutating requests are origin-checked to reduce CSRF exposure

### Booking lifecycle

Booking state is intentionally explicit:

- `pending`
- `confirmed`
- `cancelled_by_customer`
- `cancelled_by_business`
- `completed`
- `no_show`
- `expired`

Lifecycle rules are centralized in [src/lib/booking-lifecycle.ts](/D:/barber/src/lib/booking-lifecycle.ts).

Bookings are protected against double-booking by:

- availability validation before write
- database transaction checks on conflicting windows
- slot locks for blocking bookings
- expiry cleanup for stale pending requests

### Business operations

Businesses manage:

- services
- opening hours
- blocked availability windows
- gallery/media metadata
- booking inbox and status changes
- profile settings

Owner checks are enforced server-side before business mutations.

### Admin moderation

Admins can:

- list businesses by moderation state
- approve, feature, suspend, or archive businesses
- persist moderation notes and business-facing messages
- access platform-wide booking and activity data

### Notifications

Notification delivery is abstracted behind provider interfaces:

- email: console or Resend
- SMS: console or Twilio

The default safe mode is console logging for local/dev environments. No production delivery is claimed unless providers are configured.

### Media

Media is currently metadata-driven:

- URL
- alt text
- storage provider
- storage key
- MIME type
- file size

This supports local/external storage abstractions now and leaves room for S3/R2/Cloudinary adapters later.

## Operational endpoints

- `/api/health`: lightweight liveness check
- `/api/ready`: database readiness check

## Current architectural strengths

- Centralized validation schemas
- Centralized API response envelope
- Better Auth-backed session and role guards
- Explicit booking state machine
- Structured logging helper
- Repeatable migration + seed flow
- Smoke checks that exercise critical user journeys

## Remaining architectural gaps

- No queue worker for reminders or retries
- No binary upload pipeline yet
- No payment/deposit subsystem
- No tenant-level auditing dashboard beyond activity logs
- No external observability sink configured by default
