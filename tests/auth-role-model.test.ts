import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessProtectedRoute,
  getRoleHomePath,
  normalizeAuthRole,
} from "../src/lib/auth-role-model";

test("maps public business role requests to the existing shop role", () => {
  assert.equal(normalizeAuthRole("business"), "shop");
  assert.equal(normalizeAuthRole("customer"), "customer");
  assert.equal(normalizeAuthRole("admin"), "admin");
});

test("redirects authenticated users to their role home", () => {
  assert.equal(getRoleHomePath("customer"), "/account");
  assert.equal(getRoleHomePath("shop"), "/dashboard");
  assert.equal(getRoleHomePath("admin"), "/admin");
});

test("enforces the protected route role matrix", () => {
  assert.equal(canAccessProtectedRoute("customer", "/account"), true);
  assert.equal(canAccessProtectedRoute("customer", "/dashboard"), false);
  assert.equal(canAccessProtectedRoute("customer", "/admin"), false);

  assert.equal(canAccessProtectedRoute("shop", "/dashboard/settings"), true);
  assert.equal(canAccessProtectedRoute("shop", "/account"), false);
  assert.equal(canAccessProtectedRoute("shop", "/admin"), false);

  assert.equal(canAccessProtectedRoute("admin", "/admin/businesses"), true);
  assert.equal(canAccessProtectedRoute("admin", "/dashboard"), false);
  assert.equal(canAccessProtectedRoute("admin", "/account"), false);
});
