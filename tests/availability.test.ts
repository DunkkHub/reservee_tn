import assert from "node:assert/strict";
import test from "node:test";
import { addDays } from "date-fns";

import {
  findNextAvailableSlot,
  generateAvailableSlots,
  parseDateKey,
} from "../src/lib/availability";
import {
  combineDateKeyAndTime,
  formatDateKey,
  getDayOfWeekForDateKey,
} from "../src/lib/datetime";
import type { Booking, Business, Service } from "../src/lib/types";

const timeZone = "Africa/Tunis";
const dateKey = formatDateKey(addDays(new Date(), 1), timeZone);
const dayOfWeek = getDayOfWeekForDateKey(dateKey, timeZone);

function slotAt(time: string) {
  return combineDateKeyAndTime(dateKey, time, timeZone).toISOString();
}

const business: Business = {
  id: "biz-test",
  ownerId: "owner-test",
  name: "Test Studio",
  slug: "test-studio",
  timezone: timeZone,
  categoryId: "cat-barbers",
  cityId: "city-tunis",
  area: "Centre",
  address: "1 Rue Test",
  phone: "+216 20 000 000",
  whatsapp: "+216 20 000 000",
  instagram: "@test",
  tagline: "Test",
  description: "Test business",
  logoText: "TS",
  coverUrl: "",
  status: "approved",
  profileCompletion: 100,
  audience: "unisex",
  yearsInBusiness: 2,
  bookingMode: "instant",
  operatingMode: "appointment_only",
  responseWindow: "moins de 1h",
  services: [],
  hours: [
    {
      id: "hours-3",
      businessId: "biz-test",
      dayOfWeek: dayOfWeek ?? 1,
      openTime: "09:00",
      closeTime: "12:00",
      isClosed: false,
      breaks: [],
    },
  ],
  blockedSlots: [
    {
      id: "blocked-1",
      businessId: "biz-test",
      startAt: slotAt("10:00"),
      endAt: slotAt("10:30"),
      reason: "Maintenance",
    },
  ],
  media: [],
  policies: {
    cancellationNotice: "",
    lateArrivalGraceMinutes: 10,
    noShowRule: "",
    hygieneNote: "",
    depositRequired: false,
    childrenAccepted: true,
    policyClarity: "clear",
  },
  trust: {
    phoneVerified: true,
    addressVerified: true,
    adminApproved: true,
    responseTimeTracked: true,
    policyClarityBadge: true,
  },
  moderationHistory: [],
  metrics: {
    profileViews: 0,
    bookingsThisWeek: 0,
    missedBookings: 0,
    busyDays: [],
    mostBookedServiceId: "",
  },
  createdAt: "2099-01-01T00:00:00.000Z",
};

const service: Service = {
  id: "svc-test",
  businessId: business.id,
  title: "Consultation",
  description: "Test service",
  price: 10,
  durationMinutes: 45,
  active: true,
  genderTarget: "unisex",
};

const bookings: Booking[] = [
  {
    id: "booking-confirmed",
    referenceCode: "CONF-1",
    businessId: business.id,
    serviceId: service.id,
    customerName: "Confirmed Customer",
    customerPhone: "+216 20 111 111",
    startAt: slotAt("09:00"),
    endAt: slotAt("09:45"),
    status: "confirmed",
    source: "web",
    createdAt: "2099-06-01T10:00:00.000Z",
  },
  {
    id: "booking-cancelled",
    referenceCode: "CANC-1",
    businessId: business.id,
    serviceId: service.id,
    customerName: "Cancelled Customer",
    customerPhone: "+216 20 222 222",
    startAt: slotAt("11:15"),
    endAt: slotAt("12:00"),
    status: "cancelled_by_customer",
    source: "web",
    createdAt: "2099-06-01T10:00:00.000Z",
  },
];

test("generateAvailableSlots excludes blocking bookings and blocked windows", () => {
  const selectedDate = parseDateKey(dateKey, business.timezone);
  assert.ok(selectedDate);

  const slots = generateAvailableSlots(business, service, bookings, selectedDate);
  const isoSlots = slots.map((slot) => slot.toISOString());

  assert.ok(!isoSlots.includes(slotAt("09:00")));
  assert.ok(!isoSlots.includes(slotAt("09:45")));
  assert.ok(isoSlots.includes(slotAt("10:30")));
  assert.ok(isoSlots.includes(slotAt("11:00")));
});

test("cancelled customer bookings do not block the next available slot", () => {
  const nextSlot = findNextAvailableSlot(business, service, bookings, 7);

  assert.ok(nextSlot);
  assert.equal(nextSlot.toISOString(), slotAt("10:30"));
});
