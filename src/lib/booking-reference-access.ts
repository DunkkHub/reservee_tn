import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export const BOOKING_REFERENCE_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const BOOKING_REFERENCE_ACCESS_TTL_MS = 15 * 60 * 1000;
const BOOKING_REFERENCE_MAX_ATTEMPTS = 5;

type BookingReferenceChallenge = {
  id: string;
  referenceCode: string;
  customerPhone: string;
  code: string;
  expiresAt: number;
  attempts: number;
};

declare global {
  var reserveeBookingReferenceChallenges:
    | Map<string, BookingReferenceChallenge>
    | undefined;
}

function getChallengeStore() {
  if (!globalThis.reserveeBookingReferenceChallenges) {
    globalThis.reserveeBookingReferenceChallenges = new Map();
  }

  return globalThis.reserveeBookingReferenceChallenges;
}

function getBookingReferenceSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign booking access tokens.");
  }

  return `${secret}:booking-reference`;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getBookingReferenceSecret())
    .update(payload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function cleanupExpiredChallenges() {
  const store = getChallengeStore();
  const now = Date.now();

  for (const [key, challenge] of store.entries()) {
    if (challenge.expiresAt <= now || challenge.attempts >= BOOKING_REFERENCE_MAX_ATTEMPTS) {
      store.delete(key);
    }
  }
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function generateChallengeCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createBookingReferenceChallenge(input: {
  referenceCode: string;
  customerPhone: string;
}) {
  cleanupExpiredChallenges();

  const challengeId = randomUUID();
  const challenge: BookingReferenceChallenge = {
    id: challengeId,
    referenceCode: input.referenceCode.toUpperCase(),
    customerPhone: normalizePhone(input.customerPhone),
    code: generateChallengeCode(),
    expiresAt: Date.now() + BOOKING_REFERENCE_CHALLENGE_TTL_MS,
    attempts: 0,
  };

  getChallengeStore().set(challengeId, challenge);

  return {
    challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    code:
      process.env.NODE_ENV !== "production" ||
      process.env.BOOKING_OTP_DEV_PREVIEW === "true"
        ? challenge.code
        : undefined,
  };
}

export function verifyBookingReferenceChallenge(input: {
  challengeId: string;
  referenceCode: string;
  code: string;
}) {
  cleanupExpiredChallenges();

  const store = getChallengeStore();
  const challenge = store.get(input.challengeId);

  if (!challenge) {
    return {
      ok: false as const,
      message: "Challenge expired or not found.",
    };
  }

  if (challenge.referenceCode !== input.referenceCode.toUpperCase()) {
    return {
      ok: false as const,
      message: "Challenge does not match this booking reference.",
    };
  }

  if (challenge.expiresAt <= Date.now()) {
    store.delete(input.challengeId);
    return {
      ok: false as const,
      message: "Challenge expired or not found.",
    };
  }

  if (challenge.code !== input.code.trim()) {
    challenge.attempts += 1;
    store.set(input.challengeId, challenge);

    if (challenge.attempts >= BOOKING_REFERENCE_MAX_ATTEMPTS) {
      store.delete(input.challengeId);
    }

    return {
      ok: false as const,
      message: "Invalid verification code.",
    };
  }

  store.delete(input.challengeId);

  return {
    ok: true as const,
    token: createBookingReferenceAccessToken({
      referenceCode: challenge.referenceCode,
      customerPhone: challenge.customerPhone,
    }),
  };
}

export function createBookingReferenceAccessToken(input: {
  referenceCode: string;
  customerPhone: string;
}) {
  const payload = encodeBase64Url(
    JSON.stringify({
      referenceCode: input.referenceCode.toUpperCase(),
      customerPhone: normalizePhone(input.customerPhone),
      expiresAt: new Date(Date.now() + BOOKING_REFERENCE_ACCESS_TTL_MS).toISOString(),
    }),
  );

  return `${payload}.${sign(payload)}`;
}

export function parseBookingReferenceAccessToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || !constantTimeEqual(sign(payload), signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as {
      referenceCode?: string;
      customerPhone?: string;
      expiresAt?: string;
    };

    if (!parsed.referenceCode || !parsed.customerPhone || !parsed.expiresAt) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return {
      referenceCode: parsed.referenceCode.toUpperCase(),
      customerPhone: normalizePhone(parsed.customerPhone),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}
