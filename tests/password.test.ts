import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../src/lib/password";

test("hashPassword returns a salted hash that verifies correctly", () => {
  const password = "Reservee123!";
  const hash = hashPassword(password);

  assert.match(hash, /^[a-f0-9]+:[a-f0-9]+$/);
  assert.ok(verifyPassword(password, hash));
  assert.equal(verifyPassword("wrong-password", hash), false);
});

test("hashPassword generates a different hash for the same password", () => {
  const password = "Reservee123!";
  const first = hashPassword(password);
  const second = hashPassword(password);

  assert.notEqual(first, second);
  assert.ok(verifyPassword(password, first));
  assert.ok(verifyPassword(password, second));
});
