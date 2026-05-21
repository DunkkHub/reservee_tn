import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TOKEN_VERSION = "v1";

type SessionTokenVerificationResult =
  | {
      ok: true;
      token: string;
      expiresAt: string;
      expiresAtMs: number;
    }
  | {
      ok: false;
      reason: "malformed" | "expired" | "invalid_signature";
    };

function createSessionSignature(input: {
  token: string;
  expiresAtMs: number;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${SESSION_TOKEN_VERSION}.${input.token}.${input.expiresAtMs}`)
    .digest("base64url");
}

export function signSessionToken(input: {
  token: string;
  expiresAt: string;
  secret: string;
}) {
  const expiresAtMs = new Date(input.expiresAt).getTime();

  if (!Number.isFinite(expiresAtMs)) {
    throw new Error("A valid session expiry time is required.");
  }

  const signature = createSessionSignature({
    token: input.token,
    expiresAtMs,
    secret: input.secret,
  });

  return `${SESSION_TOKEN_VERSION}.${input.token}.${expiresAtMs}.${signature}`;
}

export function verifySignedSessionToken(
  value: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionTokenVerificationResult {
  if (!value) {
    return {
      ok: false,
      reason: "malformed",
    };
  }

  const [version, token, expiresAtRaw, signature] = value.split(".");
  const expiresAtMs = Number(expiresAtRaw);

  if (
    version !== SESSION_TOKEN_VERSION ||
    !token ||
    !signature ||
    !Number.isFinite(expiresAtMs)
  ) {
    return {
      ok: false,
      reason: "malformed",
    };
  }

  const expectedSignature = createSessionSignature({
    token,
    expiresAtMs,
    secret,
  });
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return {
      ok: false,
      reason: "invalid_signature",
    };
  }

  if (expiresAtMs <= now) {
    return {
      ok: false,
      reason: "expired",
    };
  }

  return {
    ok: true,
    token,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  };
}
