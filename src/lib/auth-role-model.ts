import type { UserRole } from "@/lib/auth-types";

export type PublicAuthRole = UserRole | "business";

export function normalizeAuthRole(role: PublicAuthRole): UserRole {
  return role === "business" ? "shop" : role;
}

export function getRoleHomePath(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "shop":
      return "/dashboard";
    case "customer":
    default:
      return "/account";
  }
}

export function canAccessProtectedRoute(role: UserRole, pathname: string) {
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return role === "customer";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return role === "shop";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return role === "admin";
  }

  return true;
}
