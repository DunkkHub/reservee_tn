# XAMPP + phpMyAdmin Setup

## Purpose

This project now includes a real MySQL-backed authentication layer for:

- customer accounts
- shop accounts
- admin sign-in

Marketplace content, booking demo data, and dashboard editing still use the in-browser demo store for now, but login and role separation are already backed by MySQL.

## Local defaults

The local app is configured around standard XAMPP defaults:

- host: `127.0.0.1`
- port: `3306`
- user: `root`
- password: empty
- database: `reservee_tn`

These values are already written into `.env.local`.

## Import the database

1. Start `Apache` and `MySQL` in XAMPP.
2. Open phpMyAdmin.
3. Click `Import`.
4. Choose [database/reservee_tn.sql](/D:/barber/database/reservee_tn.sql).
5. Run the import.

This creates:

- `app_users`
- `business_profiles`

It also inserts one local admin account.

## Default admin login

- email: `admin@reservee.tn`
- password: `admin12345`

Change that password immediately in any real deployment.

## Registering normal users

After the SQL import:

1. Open `/register`.
2. Choose `Customer` or `Shop`.
3. Submit the form.
4. The account is stored in MySQL.
5. The session cookie redirects the user to the correct area:
   - customer -> `/account`
   - shop -> `/dashboard`
   - admin -> `/admin`

## What is separated now

- Customers cannot open `/dashboard` or `/admin`.
- Shop users cannot open `/account` unless their role changes.
- Admin routes require an admin account.
- Public navigation shows different entry points based on the logged-in role.

## Current limitation

The app is now hybrid:

- auth and role separation: real MySQL backend
- bookings, services, moderation demo state: local browser persistence

That means login is real, but the rest of the product still behaves like a polished MVP demo until bookings, services, and moderation move to MySQL too.
