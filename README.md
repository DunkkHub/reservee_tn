# Reservee TN

Reservee TN is a mobile-first PWA booking platform for beauty businesses in Tunisia. Version 1 is intentionally focused on barbers, hair salons, beauty centers, nail studios, and spas.

The product solves two problems at once:

- Customers can discover a trusted nearby business, review services and prices, see free slots, and book quickly.
- Businesses get a premium storefront, cleaner availability management, better booking visibility, and fewer WhatsApp-driven mistakes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MySQL auth layer for customer, shop, and admin accounts
- Local demo state with seeded marketplace, business dashboard, and admin moderation data
- PWA metadata and installable shell

## Run locally

```bash
npm install
npm run lint
```

Import the MySQL schema in phpMyAdmin or with XAMPP first:

```bash
# import database/reservee_tn.sql in phpMyAdmin
npm run dev
```

Production checks:

```bash
npm run lint
npm run build
```

## Main routes

- `/` home and premium marketplace landing page
- `/explore` search, filters, sort, and city/category discovery
- `/login` shared sign-in page
- `/register` customer or shop signup
- `/account` customer-only account area
- `/business/[slug]` public business profile with services, trust, slots, waitlist, and booking CTA
- `/book/[slug]` booking flow with status-aware confirmation and reference code
- `/manage-booking` booking lookup page
- `/manage-booking/[referenceCode]` customer-side booking management
- `/dashboard` business operating dashboard
- `/dashboard/*` onboarding, bookings, services, availability, gallery, insights, and settings
- `/admin` moderation, featured logic, filters, notes, and audit trail

## MVP scope

- Customer marketplace and booking flow
- Customer account with role-protected access
- Business onboarding and operating dashboard
- Admin moderation panel
- MySQL-backed login and session handling
- Installable PWA shell
- Stronger business status model and richer booking lifecycle

## Documentation

- [Product overview](./docs/product-overview.md)
- [Functionalities](./docs/functionalities.md)
- [Testing guide](./docs/testing-guide.md)
- [Production roadmap](./docs/production-roadmap.md)
- [Design system](./docs/design-system.md)
- [XAMPP + phpMyAdmin setup](./docs/xampp-phpmyadmin-setup.md)

## Notes

- Version 1 does not include doctors, clinics, padel, football, wallets, loyalty, chat, or multi-branch logic.
- Authentication now uses MySQL, but bookings, services, moderation, and gallery edits still persist in the browser demo store for now.
