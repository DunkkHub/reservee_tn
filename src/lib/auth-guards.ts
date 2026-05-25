import "server-only";

import {
  getCurrentSession,
  getCurrentUser,
  requireRole as requireSessionRole,
  requireSession,
} from "@/lib/auth-session";
import type { UserRole } from "@/lib/auth-types";

export { getCurrentSession, getCurrentUser };

export const requireAuth = requireSession;

export async function getCurrentUserRole() {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export function requireRole(role: UserRole | UserRole[], nextPath?: string) {
  return requireSessionRole(Array.isArray(role) ? role : [role], nextPath);
}

export function requireCustomer(nextPath?: string) {
  return requireRole("customer", nextPath);
}

export function requireBusiness(nextPath?: string) {
  return requireRole("shop", nextPath);
}

export function requireAdmin(nextPath?: string) {
  return requireRole("admin", nextPath);
}
