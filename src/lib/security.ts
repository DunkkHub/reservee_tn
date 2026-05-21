import "server-only";

import { createHash } from "node:crypto";

import { env, getAllowedOrigin } from "@/lib/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export class HttpRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isEquivalentLocalOrigin(left: string, right: string) {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);

    return (
      leftUrl.protocol === rightUrl.protocol &&
      leftUrl.port === rightUrl.port &&
      LOOPBACK_HOSTS.has(leftUrl.hostname) &&
      LOOPBACK_HOSTS.has(rightUrl.hostname)
    );
  } catch {
    return false;
  }
}

export function assertAllowedOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigins = new Set([requestOrigin, getAllowedOrigin()]);
  const candidateOrigin = originHeader
    ? originHeader
    : refererHeader
      ? new URL(refererHeader).origin
      : null;

  if (
    candidateOrigin &&
    (
      allowedOrigins.has(candidateOrigin) ||
      [...allowedOrigins].some((allowedOrigin) =>
        isEquivalentLocalOrigin(candidateOrigin, allowedOrigin),
      )
    )
  ) {
    return;
  }

  if (!candidateOrigin && env.NODE_ENV !== "production") {
    return;
  }

  throw new HttpRequestError(
    403,
    "This request was blocked because its origin could not be verified.",
  );
}
