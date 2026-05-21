import assert from "node:assert/strict";
import test from "node:test";

import {
  signSessionToken,
  verifySignedSessionToken,
} from "../src/lib/auth-session-token";

const secret = "test-secret";
const token = "session-token";
const expiresAt = "2099-06-10T12:00:00.000Z";

test("signed session tokens verify with the original secret", () => {
  const signed = signSessionToken({
    token,
    expiresAt,
    secret,
  });
  const verified = verifySignedSessionToken(signed, secret, Date.parse("2099-06-10T11:00:00.000Z"));

  assert.equal(verified.ok, true);

  if (verified.ok) {
    assert.equal(verified.token, token);
    assert.equal(verified.expiresAt, expiresAt);
  }
});

test("signed session tokens fail verification when expired", () => {
  const signed = signSessionToken({
    token,
    expiresAt,
    secret,
  });
  const verified = verifySignedSessionToken(signed, secret, Date.parse("2099-06-10T12:00:00.000Z"));

  assert.deepEqual(verified, {
    ok: false,
    reason: "expired",
  });
});

test("signed session tokens fail verification when tampered", () => {
  const signed = signSessionToken({
    token,
    expiresAt,
    secret,
  });
  const tampered = signed.replace("session-token", "session-token-x");
  const verified = verifySignedSessionToken(tampered, secret);

  assert.deepEqual(verified, {
    ok: false,
    reason: "invalid_signature",
  });
});

test("signed session tokens reject malformed values", () => {
  assert.deepEqual(verifySignedSessionToken(undefined, secret), {
    ok: false,
    reason: "malformed",
  });
  assert.deepEqual(verifySignedSessionToken("bad-token", secret), {
    ok: false,
    reason: "malformed",
  });
});
