import type { AuthSessionUser, UserRole } from "@/lib/auth-types";
import { normalizePhone } from "@/lib/contact-utils";

export function hasAnyRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export function canManageBusinessProfile(
  user: Pick<AuthSessionUser, "id" | "role">,
  ownerUserId: string,
) {
  return user.role === "admin" || (user.role === "shop" && user.id === ownerUserId);
}

export function canAccessBookingPhone(
  userPhone: string | null | undefined,
  bookingPhone: string | null | undefined,
) {
  return normalizePhone(userPhone ?? "") === normalizePhone(bookingPhone ?? "");
}
