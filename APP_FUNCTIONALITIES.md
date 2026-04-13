# App Functionalities Guide

This file explains every major functionality currently implemented in this app.

The project is a mobile-first PWA booking platform for beauty businesses in Tunisia.
It is focused on:

- barbers
- hair salons
- beauty centers
- nail studios
- spas

Version 1 does not include doctors, clinics, padel, football, or other non-beauty flows.

## 1. Product Structure

The app has 3 main sides:

- Customer marketplace
- Business dashboard
- Admin moderation panel

It also includes PWA behavior so it can feel installable and app-like on mobile.

## 2. Main Tech Behavior

Implementation notes:

- Built with Next.js App Router and TypeScript
- Uses a premium dark visual system
- Uses repeatable MySQL dev seed data for local marketplace content
- Uses MySQL through XAMPP/phpMyAdmin for auth and core operational state
- Uses API-backed client state instead of browser `localStorage` for core product actions

Important:

- Customer, shop, and admin login use MySQL plus signed session cookies
- Business edits, services, availability, bookings, gallery updates, moderation, waitlist, and audit trail are persisted in MySQL
- Local setup can be prepared with `npm run db:seed-dev`
- The main remaining backend compromise is in-memory OTP and rate-limit state, not browser demo storage

## 3. Customer Marketplace Functionalities

### 3.0 Authentication and account separation

Routes:

- `/login`
- `/register`
- `/account`

What it does:

- lets customers create an account
- lets shop owners create a separate account
- lets admins sign in from the same login form
- redirects each role to the right area

Role destinations:

- customer -> `/account`
- shop -> `/dashboard`
- admin -> `/admin`

What users can do:

- customers can see their own account page
- shop owners can access dashboard tools
- admins can access moderation
- users cannot open the wrong protected area for their role

### 3.1 Home Page

Route:

- `/`

What it does:

- Shows premium hero section
- Shows platform positioning for Tunisia beauty booking
- Shows search block with city, category, and query
- Shows category cards
- Shows featured businesses
- Shows city discovery cards
- Shows partner CTA
- Shows FAQ
- Shows install button when PWA install prompt is available

Key actions:

- Start browsing immediately
- Go to explore page
- Go to partner page
- Install the PWA when supported

Main file:

- `src/components/pages/marketplace-home.tsx`

### 3.2 Explore Marketplace

Route:

- `/explore`

What it does:

- Lists live beauty businesses
- Supports free-text search
- Filters by category
- Filters by city
- Filters by area
- Filters by audience: men, women, unisex
- Filters by price tier
- Filters by open now
- Filters by available today
- Supports sorting

Sort options:

- Recommended
- Available today
- Lowest starting price
- Newest
- Featured

Key actions:

- Search by business name
- Search by service name
- Search by area text
- Compare businesses
- Open business profile
- Use WhatsApp shortcut from listing card

Main file:

- `src/components/pages/explore-browser.tsx`

### 3.3 Category Pages

Routes:

- `/category/barbers`
- `/category/hair-salons`
- `/category/beauty-centers`
- `/category/nail-studios`
- `/category/spas`

What they do:

- Reuse the explore browser
- Automatically filter businesses by category
- Present category-specific discovery entry points

Main file:

- `src/app/(public)/category/[slug]/page.tsx`

### 3.4 City Pages

Routes:

- `/city/tunis`
- `/city/sousse`
- `/city/sfax`
- `/city/ariana`
- `/city/nabeul`
- `/city/hammamet`

What they do:

- Reuse the explore browser
- Automatically filter by city
- Let the product feel city-first, which matches the launch strategy

Main file:

- `src/app/(public)/city/[slug]/page.tsx`

### 3.5 Business Profile Page

Route pattern:

- `/business/[slug]`

Examples:

- `/business/atlas-barber-club`
- `/business/maison-noura`

What it shows:

- Cover image
- Business logo mark
- Business name
- Category
- City and area
- Address
- Phone
- Instagram handle
- Verified and featured badges
- Services list with durations and prices
- Gallery
- About section
- Opening hours
- Policies
- Trust signals
- Availability module

Availability module behavior:

- Lets user choose a service
- Lets user choose a date
- Generates valid free slots only
- Hides blocked and conflicting times
- Uses business hours and breaks

Mobile behavior:

- Sticky bottom booking CTA on smaller screens

Main file:

- `src/components/pages/business-profile-page.tsx`

### 3.6 Booking Flow

Route pattern:

- `/book/[slug]`

What it does:

- Allows booking without forcing account creation
- Guides user through 4 short steps

Steps:

1. Choose service
2. Choose date and time
3. Enter customer details
4. Review and confirm

What happens on confirm:

- A new booking is created through the bookings API
- Booking status is derived from the business booking mode
- Confirmation screen is shown
- User sees business name, time, service, and WhatsApp fallback

Main file:

- `src/components/pages/booking-flow-page.tsx`

### 3.7 Manage Booking

Routes:

- `/manage-booking`
- `/manage-booking/[referenceCode]`

What it does:

- Lets the customer enter a reference code
- Requires phone verification before booking details are shown
- Loads booking details through the public OTP-backed booking API
- Allows eligible cancellation
- Allows reschedule request
- Keeps WhatsApp fallback available

Main file:

- `src/components/pages/manage-booking-page.tsx`

### 3.8 Partner Landing Page

Route:

- `/partner`

What it does:

- Explains why businesses should join
- Explains onboarding logic
- Explains premium positioning
- Links into shop signup and dashboard flow

Main file:

- `src/components/pages/partner-page.tsx`

## 4. Business Dashboard Functionalities

All business dashboard routes are under:

- `/dashboard`

The dashboard is now protected for shop and admin users.

New shop accounts also get a dedicated draft business workspace generated from their signup data.

### 4.1 Dashboard Overview

Route:

- `/dashboard`

What it shows:

- Today's bookings
- Upcoming bookings
- Pending requests
- Cancelled bookings
- No-shows
- Profile completion
- Quick actions

What users can do:

- View upcoming appointments
- Jump into other management screens
- Use reset demo action from shell

### 4.2 Onboarding Wizard

Route:

- `/dashboard/onboarding`

What it does:

- Simulates multi-step business onboarding
- Covers basics, visuals, services, schedule, policies, and submission

Steps:

1. Basics
2. Visual identity
3. Services
4. Schedule
5. Policies
6. Submit

What users can do:

- Add gallery visuals
- Add more services
- Apply schedule times
- Edit policy copy
- Submit profile for approval

### 4.3 Bookings Management

Route:

- `/dashboard/bookings`

What it does:

- Shows bookings by status tab

Tabs:

- Pending
- Confirmed
- Completed
- Cancelled
- No-show

What users can do:

- Confirm pending bookings
- Reject pending bookings
- Mark confirmed bookings as completed
- Mark confirmed bookings as no-show
- Contact customer via WhatsApp

### 4.4 Services Management

Route:

- `/dashboard/services`

What it does:

- Lists all services for the owner business
- Supports adding new services
- Supports duplicating services
- Supports pausing and resuming services
- Supports reordering services

What users can edit:

- Title
- Description
- Price
- Duration
- Audience target

### 4.5 Availability Management

Route:

- `/dashboard/availability`

What it does:

- Shows weekly opening hours
- Allows closing or opening specific weekdays
- Allows changing open and close times
- Allows adding blocked slots

What users can manage:

- Opening time
- Closing time
- Closed days
- Blocked date
- Blocked start and end time
- Reason for blocked slot

This is the operational core for slot generation in version 1.

### 4.6 Gallery Management

Route:

- `/dashboard/gallery`

What it does:

- Shows all current business images
- Allows adding new gallery image by URL

What users can add:

- Image URL
- Alt text

This is a demo-friendly image workflow until real upload/cropping is connected.

### 4.7 Insights

Route:

- `/dashboard/insights`

What it shows:

- Profile views
- Bookings this week
- Missed bookings
- Most booked service
- Busy days
- Booking status mix

Purpose:

- Gives business owners lightweight operational insights without overcomplicating MVP

### 4.8 Settings

Route:

- `/dashboard/settings`

What it does:

- Lets the owner edit public business information

Editable fields:

- Business name
- Area
- Address
- Phone
- WhatsApp
- Instagram
- Tagline
- Description
- Cancellation notice
- Late arrival rule

### 4.9 Dashboard Shell Features

What the business shell adds:

- Persistent left navigation on desktop
- Mobile shortcut navigation
- Profile completion meter
- Reset demo action
- Link to admin side

Main dashboard file:

- `src/components/pages/dashboard-pages.tsx`

Dashboard shell:

- `src/components/layout/dashboard-shell.tsx`

## 5. Admin Functionalities

Route:

- `/admin`

What it does:

- Provides moderation and marketplace control tools

### 5.1 Admin Metrics

What it shows:

- Pending requests
- Active businesses
- Bookings today
- Cities covered

### 5.2 Business Moderation

What admins can do:

- Approve business
- Request edits
- Reject business

This supports the trust requirement that businesses should not go live instantly.

### 5.3 Active Business Control

What admins can do:

- See approved businesses
- Mark a business as featured
- Remove featured status

This supports homepage curation and premium partner visibility.

### 5.4 Geography and Category Overview

What admins can review:

- Category mix
- City highlights

This helps track growth and launch focus.

Main file:

- `src/components/pages/admin-page.tsx`

Admin shell:

- `src/components/layout/admin-shell.tsx`

## 6. Availability and Booking Logic

Main file:

- `src/lib/availability.ts`

What the slot engine currently uses:

- Service duration
- Opening hours
- Break windows
- Blocked slots
- Existing pending bookings
- Existing confirmed bookings
- Current date and past time rules

What it does:

- Generates valid slots in 15-minute steps
- Rejects overlapping blocked windows
- Rejects overlapping booked windows
- Rejects times inside breaks
- Rejects past times on the current day

Important product decision:

- Version 1 uses one shared calendar per business
- No staff routing
- No multi-chair optimization
- No treatment-room logic

## 7. Seeded Tunisia Demo Data

Main file:

- `src/lib/seed-data.ts`

What is included:

- Beauty categories
- Tunisian cities
- Several sample beauty businesses
- Services for each business
- Opening hours
- Blocked slots
- Sample bookings

Current seeded business types include:

- Barbers
- Hair salons
- Beauty centers
- Nail studios
- Spas

There are also pending and changes-requested businesses to demonstrate admin moderation.

## 8. State Management and Persistence

Main file:

- `src/components/providers/platform-provider.tsx`

What is stored:

- Businesses
- Bookings
- Service changes
- Availability edits
- Gallery additions
- Admin moderation changes

How it works:

- App boots from seeded data
- If `localStorage` has previous state, it hydrates from there
- User actions update the in-browser store
- The store is saved back to `localStorage`

This gives the app realistic demo behavior without a backend.

## 9. PWA Functionalities

PWA-related files:

- `src/components/providers/pwa-provider.tsx`
- `src/app/manifest.ts`
- `src/app/icon.tsx`
- `src/app/apple-icon.tsx`
- `public/sw.js`

What is implemented:

- Web app manifest
- App icon generation
- Apple icon generation
- Service worker registration
- Basic shell caching
- Install prompt handling
- Standalone display metadata

What users can experience:

- Installability when browser supports `beforeinstallprompt`
- App-like shell behavior
- Basic offline shell fallback behavior through service worker caching

## 10. Metadata and SEO Functionalities

Files:

- `src/app/layout.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/lib/site.ts`

What is implemented:

- Title and description metadata
- Apple web app metadata
- Open Graph image generation
- Robots file
- Sitemap generation
- Site URL support via `NEXT_PUBLIC_SITE_URL`

Deployment note:

- Set `NEXT_PUBLIC_SITE_URL` in production so generated URLs use the real domain

## 11. Route Map

Public routes:

- `/`
- `/explore`
- `/partner`
- `/login`
- `/register`
- `/category/[slug]`
- `/city/[slug]`
- `/business/[slug]`
- `/book/[slug]`
- `/account`

Business routes:

- `/dashboard`
- `/dashboard/onboarding`
- `/dashboard/bookings`
- `/dashboard/services`
- `/dashboard/availability`
- `/dashboard/gallery`
- `/dashboard/insights`
- `/dashboard/settings`

Admin routes:

- `/admin`

System routes:

- `/manifest.webmanifest`
- `/robots.txt`
- `/sitemap.xml`
- `/icon`
- `/apple-icon`
- `/opengraph-image`

## 12. How To Test Every Functionality

### Customer Side Test Flow

1. Open `/`
2. Use the hero search
3. Open `/explore`
4. Try filters and sorting
5. Open a business card
6. Change service on business page
7. Change date in availability
8. Start booking
9. Confirm booking
10. Check confirmation screen

### Business Side Test Flow

1. Open `/dashboard`
2. Visit `/dashboard/bookings`
3. Confirm or reject a pending booking
4. Visit `/dashboard/services`
5. Add a service
6. Duplicate or pause a service
7. Visit `/dashboard/availability`
8. Change hours and add blocked date/time
9. Visit `/dashboard/gallery`
10. Add a new image URL
11. Visit `/dashboard/settings`
12. Edit business info

### Admin Side Test Flow

1. Open `/admin`
2. Approve a pending business
3. Request edits for another business
4. Feature or unfeature a live business
5. Review category and city breakdown

## 13. Current MVP Boundaries

Not implemented yet:

- Real image upload and cropping UI
- Email delivery
- SMS delivery
- Push notifications
- Customer accounts
- Reviews
- Deposits
- Loyalty
- Referral system
- Multi-branch business logic
- Staff routing
- Arabic localization
- Sports or medical booking workflows

## 14. Most Important Source Files

Customer side:

- `src/components/pages/marketplace-home.tsx`
- `src/components/pages/explore-browser.tsx`
- `src/components/pages/business-profile-page.tsx`
- `src/components/pages/booking-flow-page.tsx`

Business side:

- `src/components/pages/dashboard-pages.tsx`

Admin side:

- `src/components/pages/admin-page.tsx`

State and data:

- `src/components/providers/platform-provider.tsx`
- `src/lib/seed-data.ts`
- `src/lib/availability.ts`
- `src/lib/types.ts`

App shell and PWA:

- `src/app/layout.tsx`
- `src/components/layout/public-shell.tsx`
- `src/components/layout/dashboard-shell.tsx`
- `src/components/layout/admin-shell.tsx`
- `public/sw.js`

## 15. Summary

This app currently demonstrates a full MVP experience for a Tunisia beauty booking platform:

- premium customer discovery
- fast service booking
- role-based login with customer, shop, and admin separation
- clean business operations
- admin moderation
- installable PWA behavior

If you want, the next documentation step can be either:

- replace the default `README.md` with a project-specific README
- add screenshots and annotated walkthrough sections
- add API and database planning docs for production version 2
