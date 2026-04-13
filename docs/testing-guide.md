# Testing Guide

## Setup first

1. Start `Apache` and `MySQL` in XAMPP.
2. Import [database/reservee_tn.sql](/D:/barber/database/reservee_tn.sql) in phpMyAdmin.
3. Start the app with `npm run dev`.

## Auth and role separation

### Guest protection

1. Open `/account`.
2. Confirm you are redirected to `/login`.
3. Open `/dashboard`.
4. Confirm you are redirected to `/login`.
5. Open `/admin`.
6. Confirm you are redirected to `/login`.

### Customer account

1. Open `/register`.
2. Create a `Customer` account.
3. Confirm you are redirected to `/account`.
4. Confirm the account page shows customer-only actions and not the business dashboard.

### Shop account

1. Open `/register?role=shop`.
2. Create a `Shop` account.
3. Confirm you are redirected to `/dashboard`.
4. Confirm `/account` redirects away for that user.

### Admin account

1. Open `/login`.
2. Sign in with:
   - email: `admin@reservee.tn`
   - password: `admin12345`
3. Confirm you land on `/admin`.

## Customer flow

### Discovery

1. Open `/`.
2. Navigate to `/explore`.
3. Test search by city, category, service, and business name.
4. Test filters for audience, price, open now, and available today.
5. Confirm featured businesses are still easy to identify.

### Business profile

1. Open a live business page.
2. Confirm hero content, trust badges, services, gallery, policies, and opening hours are visible.
3. Select a different service and date.
4. Confirm availability updates correctly.
5. Test the preferred-time request form on a day without available slots.

### Booking flow

1. Start booking from the business page.
2. Complete the service, slot, and customer details steps.
3. Confirm booking creation.
4. Verify a reference code appears.
5. Open the manage-booking page from confirmation.

### Manage booking

1. Open `/manage-booking`.
2. Enter the reference code from a confirmed booking.
3. Verify booking details render correctly.
4. Test cancellation on an eligible booking.
5. Test reschedule request on a pending or confirmed booking.

## Business flow

### Dashboard overview

1. Open `/dashboard`.
2. Confirm stats render for bookings, waitlist, and completion.
3. Review the onboarding checklist and recent activity.

### Booking operations

1. Open `/dashboard/bookings`.
2. Switch across all booking status tabs.
3. Confirm pending bookings can be confirmed or rejected.
4. Confirm confirmed bookings can be completed, cancelled, or marked no-show.
5. Confirm WhatsApp links stay available.

### Services, availability, and gallery

1. Add a new service.
2. Duplicate, pause, and reorder services.
3. Update weekly hours.
4. Add a blocked slot.
5. Add a gallery image, set it as cover, reorder it, and delete it.

### Settings and onboarding

1. Update booking mode and operating mode.
2. Update structured policy fields.
3. Step through the onboarding flow.
4. If testing a draft or changes-requested business, confirm submit-for-review moves it to `pending_review`.

## Admin flow

### Moderation

1. Open `/admin`.
2. Filter by status, city, and category.
3. Add moderation notes.
4. Approve a pending business.
5. Request changes for another business.
6. Feature an approved business with a rank and duration.
7. Suspend or archive a profile.

### Audit and curation

1. Confirm the audit trail updates after moderation actions.
2. Confirm category and city mix panels reflect live businesses.
3. Verify featured businesses remain visible in customer discovery and ranking.

## Regression checks

After major changes, verify:

- lint passes
- production build passes
- smoke test passes
- customer, shop, and admin roles redirect correctly
- booking creation still works
- booking management still finds the correct booking by reference
- business dashboard still loads with seeded state
- admin moderation still persists in browser storage
