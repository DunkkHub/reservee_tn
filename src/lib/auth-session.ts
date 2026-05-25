import "server-only";

import type { ResultSetHeader } from "mysql2/promise";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  forbiddenResponse as createForbiddenResponse,
  unauthorizedResponse as createUnauthorizedResponse,
} from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { findSessionUserById } from "@/lib/auth-repository";
import { getRoleHomePath } from "@/lib/auth-role-model";
import type { AuthSession, UserRole } from "@/lib/auth-types";
import { getDbPool } from "@/lib/db";

export function buildRedirectPath(role: UserRole) {
  return getRoleHomePath(role);
}

export async function getCurrentSession() {
  const betterSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!betterSession?.user?.id) {
    return null;
  }

  const user = await findSessionUserById(betterSession.user.id);

  if (!user) {
    return null;
  }

  return {
    user,
    expiresAt: new Date(betterSession.session.expiresAt).toISOString(),
  } satisfies AuthSession;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function revokeSessionByToken(token: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>("DELETE FROM `session` WHERE token = ? LIMIT 1", [
    token,
  ]);
}

export async function revokeSessionsForUser(userId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>("DELETE FROM `session` WHERE userId = ?", [
    userId,
  ]);
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
