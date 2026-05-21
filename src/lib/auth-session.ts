import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import {
  forbiddenResponse as createForbiddenResponse,
  unauthorizedResponse as createUnauthorizedResponse,
} from "@/lib/api-response";
import { findSessionUserById } from "@/lib/auth-repository";
import { signSessionToken, verifySignedSessionToken } from "@/lib/auth-session-token";
import { getDbPool } from "@/lib/db";
import { fromDatabaseDateTime, toDatabaseDateTime } from "@/lib/datetime";
import { env } from "@/lib/env";
import { hashValue } from "@/lib/security";
import type { AuthSession, AuthSessionUser, UserRole } from "@/lib/auth-types";

const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

type SessionRow = RowDataPacket & {
  id: string;
  user_id: string;
  expires_at: string;
};

type CreatedSession = {
  session: AuthSession;
  token: string;
};

export const AUTH_COOKIE_NAME = env.SESSION_COOKIE_NAME;

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
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

export async function createSession(
  user: AuthSessionUser,
  request?: Request,
): Promise<CreatedSession> {
  const pool = getDbPool();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO sessions (
        id,
        user_id,
        token_hash,
        expires_at,
        last_seen_at,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?)
    `,
    [
      randomUUID(),
      user.id,
      hashValue(token),
      toDatabaseDateTime(expiresAt),
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request?.headers.get("x-real-ip") ??
        null,
      request?.headers.get("user-agent") ?? null,
    ],
  );

  return {
    token,
    session: {
      user,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

async function findSessionByToken(token: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<SessionRow[]>(
    `
      SELECT id, user_id, expires_at
      FROM sessions
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > UTC_TIMESTAMP()
      LIMIT 1
    `,
    [hashValue(token)],
  );

  return rows[0] ?? null;
}

async function touchSession(sessionId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      UPDATE sessions
      SET last_seen_at = UTC_TIMESTAMP()
      WHERE id = ?
    `,
    [sessionId],
  );
}

export async function revokeSessionByToken(token: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      UPDATE sessions
      SET revoked_at = UTC_TIMESTAMP()
      WHERE token_hash = ?
        AND revoked_at IS NULL
    `,
    [hashValue(token)],
  );
}

export async function revokeSessionsForUser(userId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      UPDATE sessions
      SET revoked_at = UTC_TIMESTAMP()
      WHERE user_id = ?
        AND revoked_at IS NULL
    `,
    [userId],
  );
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const signedToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!signedToken) {
    return null;
  }

  const verifiedToken = verifySignedSessionToken(signedToken, env.AUTH_SECRET);

  if (!verifiedToken.ok) {
    return null;
  }

  const sessionRow = await findSessionByToken(verifiedToken.token);

  if (!sessionRow) {
    return null;
  }

  const user = await findSessionUserById(sessionRow.user_id);

  if (!user) {
    return null;
  }

  const expiresAt = fromDatabaseDateTime(sessionRow.expires_at);

  if (!expiresAt) {
    return null;
  }

  await touchSession(sessionRow.id);

  return {
    user,
    expiresAt,
  } satisfies AuthSession;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export function applySessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: string,
) {
  response.cookies.set(
    AUTH_COOKIE_NAME,
    signSessionToken({
      token,
      expiresAt,
      secret: env.AUTH_SECRET,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expiresAt),
      priority: "high",
    },
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
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

export async function getApiSession() {
  return getCurrentSession();
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return createUnauthorizedResponse(message);
}

export function forbiddenResponse(message: string = "Forbidden") {
  return createForbiddenResponse(message);
}

export async function requireApiRole(roles: UserRole[]) {
  const session = await getApiSession();

  if (!session) {
    return { authorized: false, response: unauthorizedResponse() };
  }

  if (!roles.includes(session.user.role)) {
    return {
      authorized: false,
      response: forbiddenResponse(
        `This action requires one of these roles: ${roles.join(", ")}`,
      ),
    };
  }

  return { authorized: true, session };
}

export async function requireBusinessOwnership() {
  const session = await getApiSession();

  if (!session) {
    return { authorized: false, response: unauthorizedResponse() };
  }

  if (session.user.role === "admin" || session.user.role === "shop") {
    return { authorized: true, session };
  }

  return {
    authorized: false,
    response: forbiddenResponse(
      "Only shop owners and admins can perform this action",
    ),
  };
}
