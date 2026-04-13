import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import type { AuthSession, AuthSessionUser, UserRole } from "@/lib/auth-types";

export const AUTH_COOKIE_NAME = "reservee_auth";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "reservee-local-dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function buildRedirectPath(role: UserRole) {
  switch (role) {
    case "shop":
      return "/dashboard";
    case "admin":
      return "/admin";
    case "customer":
    default:
      return "/account";
  }
}

export function createSession(user: AuthSessionUser): AuthSession {
  return {
    user,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

export function serializeSession(session: AuthSession) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseSessionCookie(value?: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature || !constantTimeEqual(sign(payload), signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as AuthSession;

    if (!parsed?.user?.id || !parsed?.user?.role || !parsed?.expiresAt) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export function applySessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set(AUTH_COOKIE_NAME, serializeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireSession(nextPath?: string) {
  const session = await getCurrentSession();

  if (!session) {
    const loginUrl = nextPath
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : "/login";
    redirect(loginUrl);
  }

  return session;
}

export async function requireRole(roles: UserRole[], nextPath?: string) {
  const session = await requireSession(nextPath);

  if (!roles.includes(session.user.role)) {
    redirect(buildRedirectPath(session.user.role));
  }

  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getCurrentSession();

  if (session) {
    redirect(buildRedirectPath(session.user.role));
  }
}
