import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessBookingPhone,
  canManageBusinessProfile,
  hasAnyRole,
} from "../src/lib/access-control";

test("hasAnyRole matches allowed roles accurately", () => {
  assert.equal(hasAnyRole("customer", ["customer", "admin"]), true);
  assert.equal(hasAnyRole("shop", ["admin"]), false);
});

test("business ownership checks only allow the owner or an admin", () => {
  assert.equal(
    canManageBusinessProfile({ id: "owner-1", role: "shop" }, "owner-1"),
    true,
  );
  assert.equal(
    canManageBusinessProfile({ id: "owner-2", role: "shop" }, "owner-1"),
    false,
  );
  assert.equal(
    canManageBusinessProfile({ id: "admin-1", role: "admin" }, "owner-1"),
    true,
  );
  assert.equal(
    canManageBusinessProfile({ id: "customer-1", role: "customer" }, "owner-1"),
    false,
  );
});

test("customer booking access compares normalized phone values", () => {
  assert.equal(canAccessBookingPhone("+216 20 000 000", "+21620000000"), true);
  assert.equal(canAccessBookingPhone("+216 20 000 001", "+21620000000"), false);
});
