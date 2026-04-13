# Backend Implementation Summary

This document provides a complete overview of the Reservee backend infrastructure that has been built.

## Overview

The Reservee backend is built on Next.js 16 with TypeScript, using MySQL for data persistence and token-based authentication. The architecture follows a clean separation of concerns with repositories handling data access and API routes handling HTTP requests.

## Architecture

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MySQL 8.0+
- **Authentication**: JWT + Secure Cookies (HMAC-SHA256)
- **Validation**: Custom validation library
- **HTTP Client**: Fetch API (built-in)

### Folder Structure

```
src/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── logout/route.ts
│       │   └── session/route.ts
│       ├── bookings/
│       │   ├── route.ts (POST /api/bookings, GET)
│       │   └── [id]/route.ts (GET, PATCH)
│       ├── businesses/route.ts (GET)
│       ├── services/route.ts (GET, POST, PATCH, DELETE)
│       ├── availability/route.ts (GET, POST, DELETE)
│       └── admin/businesses/route.ts (GET, PATCH)
├── lib/
│   ├── db.ts - Database connection pooling
│   ├── auth-session.ts - Session management
│   ├── auth-types.ts - Authentication types
│   ├── auth-repository.ts - User registration/login
│   ├── password.ts - Password hashing
│   ├── booking-repository.ts - Booking operations
│   ├── business-repository.ts - Business operations
│   ├── service-repository.ts - Service operations
│   ├── business-hours-repository.ts - Hours management
│   ├── blocked-slots-repository.ts - Blocked slots
│   ├── validation.ts - Input validation
│   ├── api-response.ts - Standardized responses
│   └── types.ts - TypeScript interfaces
└── database/
    └── reservee_tn.sql - Database schema

```

## Database Schema

### Tables

1. **app_users** - User accounts
   - id, role, name, email, phone, password_hash
   - Unique: email

2. **business_profiles** - Business information
   - id, owner_user_id, business_name, category_slug, city_slug, area, address
   - Additional fields: phone, whatsapp, instagram, tagline, description, logo_text, cover_url
   - Status tracking: status, featured_until, featured_rank
   - Foreign key: owner_user_id → app_users

3. **services** - Service offerings
   - id, business_id, title, description, price, duration_minutes
   - Attributes: active, featured, gender_target, sort_order
   - Foreign key: business_id → business_profiles

4. **business_hours** - Operating hours
   - id, business_id, day_of_week, open_time, close_time, is_closed
   - Flexible: breaks (JSON array)
   - Foreign key: business_id → business_profiles

5. **bookings** - Customer bookings
   - id, reference_code, business_id, service_id
   - Customer: customer_name, customer_phone, customer_note
   - Timing: start_at, end_at, status, expires_at
   - Tracking: source, reschedule_requested_at, status_updated_at
   - Foreign keys: business_id, service_id

6. **blocked_slots** - Unavailable time periods
   - id, business_id, start_at, end_at, reason
   - Foreign key: business_id → business_profiles

7. **media_items** - Photos/images
   - id, business_id, type, url, alt, sort_order
   - Foreign key: business_id → business_profiles

8. **moderation_history** - Admin actions
   - id, business_id, status, internal_note, business_message, changed_at
   - Foreign key: business_id → business_profiles

9. **waitlist_requests** - Customer waitlist
   - id, business_id, service_id, customer_name, customer_phone, customer_note
   - Preferred_date_range, status (active/fulfilled/cancelled)
   - Foreign keys: business_id, service_id

## Core Features Implemented

### 1. Authentication System

**Files:**
- `lib/auth-session.ts` - Session creation, signing, cookie management
- `lib/auth-repository.ts` - User registration (customer/shop), login
- `lib/password.ts` - Password hashing/verification with bcrypt

**Endpoints:**
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/session` - Retrieve current session
- `POST /api/auth/logout` - Destroy session

**Features:**
- Secure password hashing (PBKDF2)
- JWT tokens with HMAC-SHA256 signing
- Automatic session expiration (7 days)
- Separate registration flows for customers and shop owners
- Email uniqueness validation

### 2. Booking System

**Files:**
- `lib/booking-repository.ts` - Booking CRUD operations
- `app/api/bookings/route.ts` - Create bookings
- `app/api/bookings/[id]/route.ts` - Get/update bookings

**Endpoints:**
- `POST /api/bookings` - Create new booking
- `GET /api/bookings?id=X` - Get booking by ID
- `GET /api/bookings?reference=X` - Get booking by reference code
- `GET /api/bookings?businessId=X` - Get business bookings
- `GET /api/bookings?customerPhone=X` - Get customer bookings
- `PATCH /api/bookings/[id]` - Update status/reschedule

**Features:**
- Unique reference codes (8-character alphanumeric)
- Automatic slot availability checking
- Booking expiration tracking (2 hours for pending)
- Support for multiple booking statuses
- Conflict detection with blocked slots
- Customer phone-based booking retrieval

### 3. Business Management

**Files:**
- `lib/business-repository.ts` - Business profile operations
- `app/api/businesses/route.ts` - Business retrieval

**Endpoints:**
- `GET /api/businesses?id=X` - Get by business ID
- `GET /api/businesses?slug=X` - Get by slug
- `GET /api/businesses?ownerId=X` - Get owner's business

**Features:**
- Complete business profile management
- Support for all business types (barbers, salons, spas, etc.)
- Featured business tracking
- Status management (draft → approved → featured)
- Default policies and trust settings
- Integration with category and city data

### 4. Service Management

**Files:**
- `lib/service-repository.ts` - Service CRUD operations
- `app/api/services/route.ts` - Service endpoints

**Endpoints:**
- `GET /api/services?businessId=X` - List services
- `POST /api/services` - Create service
- `PATCH /api/services` - Update service (toggle active, update fields)
- `DELETE /api/services?serviceId=X` - Delete service

**Features:**
- Price and duration management
- Gender targeting (women/men/unisex)
- Featured service tracking
- Sort order management
- Service activation/deactivation
- Validation for minimum duration (5 minutes)

### 5. Availability Management

**Files:**
- `lib/business-hours-repository.ts` - Hours management
- `lib/blocked-slots-repository.ts` - Blocked slots
- `app/api/availability/route.ts` - Availability endpoints

**Endpoints:**
- `GET /api/availability?businessId=X` - Get hours and blocked slots
- `POST /api/availability` - Update hours or create blocked slots
- `DELETE /api/availability?businessId=X&slotId=Y` - Delete blocked slot

**Features:**
- 7-day weekly schedule (0=Sunday to 6=Saturday)
- Break periods within days (JSON array)
- Automatic default hours initialization (9 AM - 6 PM)
- Blocked slots for vacations, maintenance, etc.
- Overlap detection for blocked periods
- Date-based blocked slot retrieval

### 6. Admin Operations

**Files:**
- `app/api/admin/businesses/route.ts` - Admin endpoints

**Endpoints:**
- `GET /api/admin/businesses` - List all businesses (with filtering)
- `PATCH /api/admin/businesses` - Moderate business (change status, feature, etc.)

**Features:**
- Business status management
- Featured business assignment with ranking
- Moderation history tracking
- Internal notes and business messages
- Pagination support (limit/offset)
- Status-based filtering

## Validation System

**File:** `lib/validation.ts`

**Validators:**
- `validateEmail()` - Email format validation
- `validatePhone()` - Phone number format
- `validatePassword()` - Password strength (8 chars, upper, lower, number)
- `validateServiceInput()` - Service creation validation
- `validateBookingInput()` - Booking validation
- `validateBusinessProfileInput()` - Profile validation

**Features:**
- Field-specific error messages
- Reusable validation functions
- Structured error objects with field names

## Response System

**File:** `lib/api-response.ts`

**Response Helpers:**
- `successResponse()` - 200 OK response
- `createdResponse()` - 201 Created response
- `errorResponse()` - Generic error
- `notFoundResponse()` - 404 Not Found
- `unauthorizedResponse()` - 401 Unauthorized
- `forbiddenResponse()` - 403 Forbidden
- `conflictResponse()` - 409 Conflict
- `validationErrorResponse()` - Validation failures
- `serverErrorResponse()` - 500 Server Error

**Standardized Format:**
```json
{
  "ok": boolean,
  "message": "string",
  "data": "T | undefined",
  "errors": "ValidationError[] | undefined"
}
```

## Database Connection

**File:** `lib/db.ts`

**Features:**
- MySQL connection pooling
- Environment configuration (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- Default localhost development setup
- Helpful error messages for common issues:
  - ECONNREFUSED - MySQL not running
  - ER_BAD_DB_ERROR - Database doesn't exist
  - ER_ACCESS_DENIED_ERROR - Wrong credentials
- Global pool caching to avoid multiple connections

## Environment Variables

Required `.env.local`:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=reservee_tn
AUTH_SECRET=reservee-local-dev-secret
```

## Setup Instructions

### 1. Database Setup

1. Start MySQL/XAMPP
2. Run the SQL schema:
   ```bash
   mysql -u root < database/reservee_tn.sql
   ```
3. Verify connection with:
   ```bash
   mysql -u root -h 127.0.0.1 reservee_tn -e "SELECT 1"
   ```

### 2. Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 3. Testing Endpoints

Use curl, Postman, or VS Code REST Client:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","name":"Test User","email":"test@example.com","phone":"+216 50 123 456","password":"TestPass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz-id","serviceId":"srv-id","customerName":"John","customerPhone":"+216 50 123 456","startAt":"2024-04-15T10:00:00","endAt":"2024-04-15T11:00:00"}'
```

## Security Considerations

1. **Password Security**: Uses PBKDF2 hashing with salt
2. **Session Security**: HMAC-SHA256 signed tokens, HttpOnly secure cookies
3. **Input Validation**: All user inputs validated before database operations
4. **SQL Injection Prevention**: Uses parameterized queries with mysql2/promise
5. **CORS**: Configured through Next.js (add to next.config.ts if needed)
6. **Rate Limiting**: TODO - add for production

## Performance Optimizations

1. **Database Indexing**: Added indexes on frequently queried columns
   - business_profiles.status, city_slug, category_slug
   - bookings.business_id, status, start_at, customer_phone
   - services.business_id, active
   - business_hours.business_id
   - blocked_slots.business_id, start_at

2. **Connection Pooling**: MySQL connection pool (10 connections max)

3. **Query Optimization**: N+1 queries avoided through proper joins

4. **Caching**: Session data cached in HTTP-only cookies

## Error Handling

All API endpoints implement consistent error handling:
- Request validation before processing
- Database error translation to user-friendly messages
- Try-catch blocks wrapping database operations
- Structured error responses with field-specific messages

## Testing

Ready for extensive testing:
- Unit tests for repositories (validation logic, db operations)
- Integration tests for complete user flows
- Load testing for connection pooling
- Security testing for input validation and SQL injection

## Future Enhancements

1. **Rate Limiting** - Implement Redis-based rate limiting
2. **Caching** - Database query results caching
3. **Webhooks** - Real-time notifications
4. **File Upload** - Image handling for media items
5. **Email Notifications** - Booking confirmations
6. **SMS Integration** - WhatsApp/SMS bookings
7. **Analytics** - Business insights and metrics
8. **Search** - Full-text search for businesses/services
9. **Payment Processing** - Deposits and online payments
10. **Multi-language** - i18n support

## Complete API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed endpoint specifications with:
- Request/response examples
- Query parameters
- Error codes
- Curl examples

