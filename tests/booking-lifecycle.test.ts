import assert from "node:assert/strict";
import test from "node:test";

import {
  canBusinessCancel,
  canBusinessComplete,
  canBusinessConfirm,
  canCustomerCancel,
  canTransitionBookingStatus,
  findBookingConflicts,
  getBookingTransitionErrorMessage,
  isBookingBlockingStatus,
} from "../src/lib/booking-lifecycle";
import type { Booking } from "../src/lib/types";

function createBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: overrides.id ?? "booking-1",
    referenceCode: overrides.referenceCode ?? "RB-TEST-001",
    businessId: overrides.businessId ?? "business-1",
    serviceId: overrides.serviceId ?? "service-1",
    customerUserId: overrides.customerUserId ?? null,
    customerName: overrides.customerName ?? "Test Customer",
    customerPhone: overrides.customerPhone ?? "+216 20 000 000",
    customerNote: overrides.customerNote,
    startAt: overrides.startAt ?? "2099-06-10T10:00:00.000Z",
    endAt: overrides.endAt ?? "2099-06-10T10:45:00.000Z",
    status: overrides.status ?? "pending",
    source: overrides.source ?? "web",
    expiresAt: overrides.expiresAt ?? null,
    rescheduleRequestedAt: overrides.rescheduleRequestedAt ?? null,
    statusUpdatedAt: overrides.statusUpdatedAt ?? null,
    createdAt: overrides.createdAt ?? "2099-06-01T09:00:00.000Z",
  };
}

test("booking conflicts only include overlapping blocking bookings", () => {
  const candidate = createBooking({
    id: "candidate",
    startAt: "2099-06-10T10:15:00.000Z",
    endAt: "2099-06-10T11:00:00.000Z",
  });
  const conflicts = findBookingConflicts(
    [
      createBooking({
        id: "confirmed-conflict",
        status: "confirmed",
      }),
      createBooking({
        id: "cancelled-ignore",
        startAt: "2099-06-10T10:00:00.000Z",
        endAt: "2099-06-10T10:45:00.000Z",
        status: "cancelled_by_customer",
      }),
      createBooking({
        id: "different-business",
        businessId: "business-2",
        status: "pending",
      }),
    ],
    candidate,
  );

  assert.deepEqual(conflicts.map((booking) => booking.id), ["confirmed-conflict"]);
});

test("booking blocking status only covers pending and confirmed", () => {
  assert.equal(isBookingBlockingStatus("pending"), true);
  assert.equal(isBookingBlockingStatus("confirmed"), true);
  assert.equal(isBookingBlockingStatus("completed"), false);
  assert.equal(isBookingBlockingStatus("cancelled_by_business"), false);
});

test("customer and business transition helpers enforce valid booking lifecycle moves", () => {
  const futureNow = Date.parse("2099-06-10T09:00:00.000Z");

  assert.equal(canCustomerCancel(createBooking(), futureNow), true);
  assert.equal(
    canCustomerCancel(createBooking({ status: "completed" }), futureNow),
    false,
  );
  assert.equal(canBusinessConfirm(createBooking()), true);
  assert.equal(canBusinessComplete(createBooking({ status: "pending" })), false);
  assert.equal(
    canBusinessCancel(createBooking({ status: "confirmed" }), futureNow),
    true,
  );
});

test("invalid transition messages are explicit for the actor surface", () => {
  assert.equal(
    canTransitionBookingStatus("pending", "confirmed", "shop"),
    true,
  );
  assert.equal(
    canTransitionBookingStatus("pending", "completed", "shop"),
    false,
  );
  assert.equal(
    getBookingTransitionErrorMessage("pending", "completed", "shop"),
    "This booking cannot move to that status from the business dashboard.",
  );
  assert.equal(
    getBookingTransitionErrorMessage("completed", "confirmed", "customer"),
    "This booking is already final and cannot change status anymore.",
  );
});
