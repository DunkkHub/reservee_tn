# Functionalities

## Purpose

This document explains the current product functionality across the customer experience, business dashboard, admin panel, and shared platform rules.

## Customer side

### Authentication and role separation

Customers can now:

- create an account
- sign in
- access a dedicated `/account` area
- see their own booking management surface without entering shop tools

Shop users can now:

- create a shop account
- sign in
- access `/dashboard`
- get redirected away from customer-only pages

Admin users can now:

- sign in from the same login screen
- access `/admin`
- stay separated from customer and shop spaces

### Persistence model

Core product behavior now comes from MySQL-backed API routes instead of browser `localStorage`.

That includes:

- live marketplace businesses
- business profile edits
- services
- weekly hours and blocked slots
- bookings
- gallery changes
- waitlist requests
- moderation history
- audit activity

### Discovery and search

Customers can:

- browse by city and category
- search by business name, area, or service
- filter by category, city, area, audience, price, open now, and available today
- sort by recommended, availability, price, newest, and featured

### Business profile

Each public business page includes:

- cover image and premium hero area
- core trust badges
- address and contact info
- visible services with price and duration
- availability preview
- gallery
- about section
- structured policies
- operating mode
- opening hours
- preferred-time request form when a day has no slots

### Booking flow

The booking flow supports:

- service selection
- date and time selection
- customer details
- review before confirm
- booking creation with reference code
- status-aware confirmation screen
- WhatsApp fallback

### Customer booking management

Customers can:

- open a manage-booking page with a reference code
- view booking status
- cancel an eligible booking
- request a reschedule
- contact the business by WhatsApp
- review bookings from the protected `/account` page when the booking phone matches their account phone

### Public booking verification API

The public booking-reference API now uses a three-step verification flow:

- request a short-lived code with booking reference plus phone number
- verify the code
- use the returned short-lived access token to read the booking

Security behavior:

- no raw booking payload is returned from reference code alone
- code request and verification are rate-limited
- development environments can expose a preview code for local testing
- production environments are structured for SMS delivery instead
- public manage-booking UI now follows this same OTP-backed flow

## Business dashboard

### Dashboard overview

The owner dashboard shows:

- today bookings
- pending replies
- upcoming flow
- waitlist demand
- profile completion
- onboarding checklist
- trust and moderation status
- recent activity

### Bookings

The booking table supports these statuses:

- pending
- confirmed
- completed
- cancelled_by_customer
- cancelled_by_business
- rejected
- expired
- no_show

Owner actions include:

- confirm
- reject
- cancel by business
- mark completed
- mark no-show
- contact by WhatsApp

### Services

Owners can:

- add service
- duplicate service
- pause or resume service
- reorder services

### Availability

Owners can manage:

- weekly hours
- closed days
- blocked slots
- service-facing slot accuracy

### Gallery

Owners can:

- add gallery images
- set a cover image
- reorder gallery images
- delete gallery images
- keep within a gallery limit

### Insights

The first analytics layer includes:

- profile views
- bookings this week
- missed bookings
- waitlist requests
- busy days
- status mix
- recent audit activity

### Settings

Settings currently cover:

- business basics
- contact details
- booking mode
- operating mode
- audience
- cancellation notice
- late arrival grace
- no-show rule
- hygiene note
- policy clarity

### Onboarding

The onboarding wizard tracks:

- basics
- visuals
- services
- schedule
- policies
- review readiness

## Admin side

### Moderation

Admin can:

- review businesses by status
- filter by city and category
- add internal notes
- add business-facing messages
- approve
- request changes
- feature
- suspend
- archive

### Featured logic

Featured placement now supports:

- status-based activation
- featured duration
- priority rank

### Audit and oversight

Admin also sees:

- live business counts
- pending review counts
- bookings today
- category mix
- city mix
- audit trail

## Shared platform rules

### Business statuses

Businesses use:

- draft
- pending_review
- changes_requested
- approved
- featured
- suspended
- archived

### Booking lifecycle

Bookings use:

- pending
- confirmed
- completed
- cancelled_by_customer
- cancelled_by_business
- rejected
- expired
- no_show

### Trust layer

Trust modules currently include:

- verified phone
- verified address
- admin approved
- profile completion
- joined date
- policy clarity badge

### Implementation notes

- Authentication is Better Auth-backed and persisted in MySQL.
- Better Auth session cookies plus server-side role guards separate customer, shop, and admin access.
- New shop accounts can enter a dedicated dashboard workspace immediately.
- Marketplace, bookings, services, moderation, and gallery edits are persisted through MySQL-backed API routes.
- Seeded data still gives the app realistic marketplace, dashboard, and moderation behavior for local/staging validation.
