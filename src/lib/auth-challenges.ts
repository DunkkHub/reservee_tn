import "server-only";

import { randomInt, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { hashValue } from "@/lib/security";
import { toDatabaseDateTime } from "@/lib/datetime";
import type { VerificationDeliveryChannel } from "@/lib/verification-delivery";

export const AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const AUTH_CHALLENGE_MAX_ATTEMPTS = 5;

export type AuthChallengePurpose = "login" | "password_reset";

type AuthChallengeRow = RowDataPacket & {
  id: string;
  user_id: string;
  purpose: AuthChallengePurpose;
  delivery_channel: VerificationDeliveryChannel;
  destination: string;
  code_hash: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  consumed_at: string | null;
};

function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function cleanupAuthChallenges() {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      DELETE FROM auth_challenges
      WHERE expires_at <= UTC_TIMESTAMP()
         OR consumed_at IS NOT NULL
         OR attempt_count >= max_attempts
    `,
  );
}

export async function createAuthChallenge(input: {
  userId: string;
  purpose: AuthChallengePurpose;
  deliveryChannel: VerificationDeliveryChannel;
  destination: string;
}) {
  await cleanupAuthChallenges();

  const pool = getDbPool();
  const challengeId = randomUUID();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + AUTH_CHALLENGE_TTL_MS);

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO auth_challenges (
        id,
        purpose,
        user_id,
        delivery_channel,
        destination,
        code_hash,
        attempt_count,
        max_attempts,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `,
    [
      challengeId,
      input.purpose,
      input.userId,
      input.deliveryChannel,
      input.destination,
      hashValue(code),
      AUTH_CHALLENGE_MAX_ATTEMPTS,
      toDatabaseDateTime(expiresAt),
    ],
  );

  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    code,
  };
}

export async function verifyAuthChallenge(input: {
  challengeId: string;
  purpose: AuthChallengePurpose;
  code: string;
}) {
  await cleanupAuthChallenges();

  const pool = getDbPool();
  const [rows] = await pool.query<AuthChallengeRow[]>(
    `
      SELECT *
      FROM auth_challenges
      WHERE id = ?
        AND purpose = ?
      LIMIT 1
    `,
    [input.challengeId, input.purpose],
  );

  const challenge = rows[0];

  if (!challenge || challenge.consumed_at) {
    return {
      ok: false as const,
      message: "Verification session expired or not found.",
    };
  }

  if (new Date(`${challenge.expires_at}Z`).getTime() <= Date.now()) {
    return {
      ok: false as const,
      message: "Verification session expired or not found.",
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

  return {
    ok: true as const,
    userId: challenge.user_id,
    deliveryChannel: challenge.delivery_channel,
    destination: challenge.destination,
  };
}
