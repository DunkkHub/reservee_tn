import "server-only";

import { randomInt, randomUUID, randomBytes } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { toDatabaseDateTime } from "@/lib/datetime";
import { hashValue } from "@/lib/security";

export { normalizePhone } from "@/lib/contact-utils";
import { normalizePhone } from "@/lib/contact-utils";

export const BOOKING_REFERENCE_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const BOOKING_REFERENCE_ACCESS_TTL_MS = 15 * 60 * 1000;
const BOOKING_REFERENCE_MAX_ATTEMPTS = 5;

type AuthChallengeRow = RowDataPacket & {
  id: string;
  reference_code: string;
  customer_phone_normalized: string;
  destination: string;
  code_hash: string;
  attempt_count: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
};

type BookingAccessSessionRow = RowDataPacket & {
  reference_code: string;
  customer_phone_normalized: string;
  expires_at: string;
};

function generateChallengeCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function generateAccessToken() {
  return randomBytes(32).toString("base64url");
}

async function cleanupBookingReferenceArtifacts() {
  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      DELETE FROM auth_challenges
      WHERE purpose = 'booking_access'
        AND (
          expires_at <= UTC_TIMESTAMP()
          OR consumed_at IS NOT NULL
          OR attempt_count >= max_attempts
        )
    `,
  );

  await pool.execute<ResultSetHeader>(
    `
      DELETE FROM booking_access_sessions
      WHERE expires_at <= UTC_TIMESTAMP()
    `,
  );
}

export async function createBookingReferenceChallenge(input: {
  referenceCode: string;
  customerPhone: string;
}) {
  await cleanupBookingReferenceArtifacts();

  const pool = getDbPool();
  const challengeId = randomUUID();
  const code = generateChallengeCode();
  const expiresAt = new Date(Date.now() + BOOKING_REFERENCE_CHALLENGE_TTL_MS);

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO auth_challenges (
        id,
        purpose,
        reference_code,
        customer_phone_normalized,
        delivery_channel,
        destination,
        code_hash,
        attempt_count,
        max_attempts,
        expires_at
      )
      VALUES (?, 'booking_access', ?, ?, 'sms', ?, ?, 0, ?, ?)
    `,
    [
      challengeId,
      input.referenceCode.toUpperCase(),
      normalizePhone(input.customerPhone),
      input.customerPhone,
      hashValue(code),
      BOOKING_REFERENCE_MAX_ATTEMPTS,
      toDatabaseDateTime(expiresAt),
    ],
  );

  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    code,
  };
}

export async function verifyBookingReferenceChallenge(input: {
  challengeId: string;
  referenceCode: string;
  code: string;
}) {
  await cleanupBookingReferenceArtifacts();

  const pool = getDbPool();
  const [rows] = await pool.query<AuthChallengeRow[]>(
    `
      SELECT *
      FROM auth_challenges
      WHERE id = ?
        AND purpose = 'booking_access'
      LIMIT 1
    `,
    [input.challengeId],
  );

  const challenge = rows[0];

  if (!challenge) {
    return {
      ok: false as const,
      message: "Challenge expired or not found.",
    };
  }

  if (challenge.reference_code !== input.referenceCode.toUpperCase()) {
    return {
      ok: false as const,
      message: "Challenge does not match this booking reference.",
    };
  }

  if (challenge.consumed_at || new Date(`${challenge.expires_at}Z`).getTime() <= Date.now()) {
    return {
      ok: false as const,
      message: "Challenge expired or not found.",
    };
  }

  if (hashValue(input.code.trim()) !== challenge.code_hash) {
    await pool.execute<ResultSetHeader>(
      `
        UPDATE auth_challenges
        SET attempt_count = attempt_count + 1
        WHERE id = ?
      `,
      [input.challengeId],
    );

    return {
      ok: false as const,
      message: "Invalid verification code.",
    };
  }

  await pool.execute<ResultSetHeader>(
    `
      UPDATE auth_challenges
      SET consumed_at = UTC_TIMESTAMP()
      WHERE id = ?
    `,
    [input.challengeId],
  );

  const token = generateAccessToken();
  const expiresAt = new Date(Date.now() + BOOKING_REFERENCE_ACCESS_TTL_MS);

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO booking_access_sessions (
        id,
        reference_code,
        customer_phone_normalized,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      challenge.reference_code,
      challenge.customer_phone_normalized,
      hashValue(token),
      toDatabaseDateTime(expiresAt),
    ],
  );

  return {
    ok: true as const,
    token,
  };
}

export async function parseBookingReferenceAccessToken(token?: string | null) {
  if (!token) {
    return null;
  }

  await cleanupBookingReferenceArtifacts();

  const pool = getDbPool();
  const [rows] = await pool.query<BookingAccessSessionRow[]>(
    `
      SELECT reference_code, customer_phone_normalized, expires_at
      FROM booking_access_sessions
      WHERE token_hash = ?
        AND expires_at > UTC_TIMESTAMP()
      LIMIT 1
    `,
    [hashValue(token)],
  );

  const session = rows[0];

  if (!session) {
    return null;
  }

  return {
    referenceCode: session.reference_code.toUpperCase(),
    customerPhone: session.customer_phone_normalized,
    expiresAt: new Date(`${session.expires_at}Z`).toISOString(),
  };
}
