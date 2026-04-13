# Production Roadmap

## Goal

This project already behaves like a believable product demo. The next phase is converting it into a production-ready system without losing the premium user experience.

## Core backend work

### Authentication

- customer, shop, and admin sign-in are now live on MySQL
- password reset and verification
- optional customer magic-link or OTP flow later

### Database

- MySQL already stores auth users and shop profile shells
- move businesses, services, hours, blocked slots, bookings, media, moderation, and audit logs into MySQL next
- add migrations and repeatable seed pipeline

### Media upload

- Cloudinary or Supabase Storage integration
- upload validation
- compression and cropping
- storage limits by plan

### Notifications

- booking confirmation emails
- business new-booking alerts
- booking reminder jobs
- push notification roadmap for installable PWA

### Background jobs

- pending booking expiry
- reminder scheduling
- featured expiration
- analytics aggregation
- moderation queue housekeeping

## Permissions and access

Production roles should include:

- public visitor
- business owner
- admin

Route and action protection should cover:

- dashboard access
- admin access
- booking mutation actions
- moderation actions

## Booking and trust improvements

Priority production upgrades:

- validated booking expiry jobs
- better anti-spam controls
- verification workflows for phone and address
- structured moderation reasons
- business-side reschedule proposals

## Analytics and observability

- page analytics
- search analytics
- conversion funnel from profile view to booking
- failed booking telemetry
- moderation activity tracking
- error reporting and uptime alerts

## Commercial roadmap

### Launch monetization

- free listing tier
- paid featured tier
- manual premium onboarding service

### Later monetization

- subscription billing
- insights upgrades
- photo and service limits by plan

## Phase order

1. Move booking and business data from local demo state into MySQL
2. Media upload and image management
3. Notification and expiry jobs
4. Production moderation and verification workflows
5. Billing, analytics, and growth tooling
