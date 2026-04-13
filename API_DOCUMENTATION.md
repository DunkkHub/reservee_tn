# Reservee Backend API Documentation

This document describes all available API endpoints for the Reservee booking platform.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://reservee.tn`

## Authentication

Most endpoints require user authentication via JWT token in cookies. Authentication is handled through the `/api/auth` endpoints.

---

## Authentication Endpoints

### POST `/api/auth/register`

Register a new user (customer or shop).

**Body:**
```json
{
  "role": "customer" | "shop",
  "name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  // Shop-specific fields:
  "businessName": "string (if role=shop)",
  "categorySlug": "barbers" | "hair-salons" | "beauty-centers" | "nail-studios" | "spas",
  "citySlug": "string",
  "area": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Account created successfully",
  "session": {
    "user": { ... },
    "expiresAt": "ISO-8601 date"
  },
  "redirectTo": "/path"
}
```

### POST `/api/auth/login`

Login an existing user.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** Same as register

### GET `/api/auth/session`

Get current user's session.

**Response:**
```json
{
  "session": {
    "user": { ... },
    "expiresAt": "ISO-8601 date"
  }
}
```

### POST `/api/auth/logout`

Logout the current user.

---

## Business Endpoints

### GET `/api/businesses`

Get business information.

**Query Parameters:**
- `id`: Get by ID
- `slug`: Get by slug
- `ownerId`: Get by owner user ID

**Response:**
```json
{
  "ok": true,
  "data": { Business object }
}
```

### PATCH `/api/businesses/:id`

Update business profile (requires owner authentication).

**Body:**
```json
{
  "business_name": "string",
  "address": "string",
  "phone": "string",
  "whatsapp": "string",
  "instagram": "string",
  "tagline": "string",
  "description": "string",
  "logo_text": "string",
  "cover_url": "string",
  "audience": "women" | "men" | "unisex",
  "years_in_business": "number",
  "response_window": "string"
}
```

---

## Services Endpoints

### GET `/api/services`

Get services for a business.

**Query Parameters:**
- `businessId` (required): Business ID

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "string",
      "businessId": "string",
      "title": "string",
      "description": "string",
      "price": "number",
      "durationMinutes": "number",
      "active": "boolean",
      "featured": "boolean",
      "genderTarget": "women" | "men" | "unisex"
    }
  ]
}
```

### POST `/api/services`

Create a new service (requires owner authentication).

**Body:**
```json
{
  "businessId": "string (required)",
  "title": "string (required)",
  "description": "string",
  "price": "number (required)",
  "durationMinutes": "number (required, min 5)",
  "genderTarget": "women" | "men" | "unisex"
}
```

### PATCH `/api/services`

Update a service.

**Body:**
```json
{
  "serviceId": "string (required)",
  "title": "string",
  "description": "string",
  "price": "number",
  "durationMinutes": "number",
  "genderTarget": "women" | "men" | "unisex",
  "active": "boolean",
  "featured": "boolean",
  "actionType": "toggle" // Optional: use this to toggle active status
}
```

### DELETE `/api/services`

Delete a service.

**Query Parameters:**
- `serviceId` (required): Service ID to delete

---

## Bookings Endpoints

### POST `/api/bookings`

Create a new booking.

**Body:**
```json
{
  "businessId": "string (required)",
  "serviceId": "string (required)",
  "customerName": "string (required)",
  "customerPhone": "string (required)",
  "customerNote": "string",
  "startAt": "ISO-8601 datetime (required)",
  "endAt": "ISO-8601 datetime (required)",
  "source": "web" | "dashboard"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Booking created successfully",
  "data": {
    "id": "string",
    "referenceCode": "string",
    "businessId": "string",
    "serviceId": "string",
    "customerName": "string",
    "customerPhone": "string",
    "startAt": "ISO-8601 datetime",
    "endAt": "ISO-8601 datetime",
    "status": "pending" | "confirmed" | "completed" | "cancelled_by_customer" | "cancelled_by_business" | "rejected" | "expired" | "no_show",
    "source": "web" | "dashboard",
    "expiresAt": "ISO-8601 datetime | null",
    "createdAt": "ISO-8601 datetime"
  }
}
```

### GET `/api/bookings/[id]`

Get booking information.

**Query Parameters:**
- `id`: Get by booking ID
- `reference`: Get by reference code
- `businessId`: Get all bookings for a business
- `customerPhone`: Get all bookings by customer phone

**Response:** Booking object or array of bookings

### PATCH `/api/bookings/[id]`

Update booking status or take action.

**Body:**
```json
{
  "bookingId": "string (required)",
  "status": "pending" | "confirmed" | "completed" | "cancelled_by_customer" | "cancelled_by_business" | "rejected" | "expired" | "no_show",
  "action": "updateStatus" | "requestReschedule" | "expireOld"
}
```

---

## Availability Endpoints

### GET `/api/availability`

Get business hours and blocked slots.

**Query Parameters:**
- `businessId` (required)
- `type` (optional): "hours" | "blocked" | default returns both

**Response:**
```json
{
  "ok": true,
  "data": {
    "hours": [ BusinessHours[] ],
    "blocked": [ BlockedSlot[] ]
  }
}
```

### POST `/api/availability`

Update business hours or create blocked slots.

**Body for hours:**
```json
{
  "businessId": "string",
  "type": "hours",
  "dayOfWeek": "0-6",
  "openTime": "HH:mm",
  "closeTime": "HH:mm",
  "isClosed": "boolean",
  "breaks": [
    { "start": "HH:mm", "end": "HH:mm" }
  ]
}
```

**Body for blocked slots:**
```json
{
  "businessId": "string",
  "type": "blocked",
  "startAt": "ISO-8601 datetime",
  "endAt": "ISO-8601 datetime",
  "reason": "string"
}
```

### DELETE `/api/availability`

Delete a blocked slot.

**Query Parameters:**
- `businessId` (required)
- `slotId` (required)

---

## Admin Endpoints

### GET `/api/admin/businesses`

List all businesses for moderation (admin only).

**Query Parameters:**
- `status`: Filter by status
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "string",
      "business_name": "string",
      "slug": "string",
      "status": "BusinessStatus",
      "created_at": "ISO-8601 datetime"
    }
  ]
}
```

### PATCH `/api/admin/businesses`

Update business moderation status (admin only).

**Body:**
```json
{
  "businessId": "string (required)",
  "status": "draft" | "pending_review" | "changes_requested" | "approved" | "featured" | "suspended" | "archived",
  "featuredUntil": "ISO-8601 datetime | null",
  "featuredRank": "number",
  "internalNote": "string",
  "businessMessage": "string"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "ok": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad request / Validation error
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `409`: Conflict (e.g., duplicate email)
- `500`: Internal server error

---

## Validation Rules

### Booking Validation

- Customer name: 1-120 characters
- Customer phone: Valid phone format (10+ characters with numbers)
- Start time: Cannot be in the past
- End time: Must be after start time
- Duration: End time - start time must match service duration

### Service Validation

- Title: 1-120 characters
- Price: Must be ≥ 0
- Duration: 5-480 minutes

### Business Profile Validation

- Business name: 1-160 characters
- Address: 1-190 characters
- Phone: Valid phone format
- Category: Must be valid category slug
- City: Must be valid city slug

---

## Rate Limiting

Currently not implemented. Will be added in production.

---

## Examples

### Create a booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "biz-atlas",
    "serviceId": "srv-123",
    "customerName": "Ahmed Ben Ali",
    "customerPhone": "+216 50 123 456",
    "startAt": "2024-04-15T10:00:00",
    "endAt": "2024-04-15T11:00:00"
  }'
```

### Get business details

```bash
curl http://localhost:3000/api/businesses?slug=atlas-barber-club
```

### Update business hours

```bash
curl -X POST http://localhost:3000/api/availability \
  -H "Content-Type: application/json" \
  -H "Cookie: reservee_auth=..." \
  -d '{
    "businessId": "biz-atlas",
    "type": "hours",
    "dayOfWeek": 1,
    "openTime": "09:00",
    "closeTime": "18:00",
    "isClosed": false
  }'
```
