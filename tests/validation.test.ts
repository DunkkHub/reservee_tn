import assert from "node:assert/strict";
import test from "node:test";

import {
  bookingCreateSchema,
  loginVerifyRequestSchema,
  registerRequestSchema,
  validatePassword,
} from "../src/lib/validation";

test("password validation requires strong passwords", () => {
  const weak = validatePassword("weakpass");
  const strong = validatePassword("Reservee123!");

  assert.equal(weak.valid, false);
  assert.ok(weak.errors.length > 0);
  assert.equal(strong.valid, true);
});

test("registration schema accepts valid shop payloads", () => {
  const parsed = registerRequestSchema.safeParse({
    role: "shop",
    name: "Atlas Owner",
    email: "atlas@example.com",
    phone: "+216 20 111 111",
    password: "Reservee123!",
    businessName: "Atlas Barber Club",
    categorySlug: "barbers",
    citySlug: "tunis",
    area: "Lac 2",
  });

  assert.equal(parsed.success, true);
});

test("booking creation schema rejects invalid input", () => {
  const parsed = bookingCreateSchema.safeParse({
    businessId: "biz-1",
    serviceId: "svc-1",
    customerName: "A",
    customerPhone: "not-a-phone",
    startAt: "tomorrow",
  });

  assert.equal(parsed.success, false);
});

test("login verification requires a six digit code", () => {
  const parsed = loginVerifyRequestSchema.safeParse({
    challengeId: "challenge-1",
    code: "12345",
  });

  assert.equal(parsed.success, false);
});
