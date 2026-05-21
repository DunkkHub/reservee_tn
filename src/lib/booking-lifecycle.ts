import type { Booking, BookingStatus } from "@/lib/types";

export type BookingActorRole = "customer" | "shop" | "admin" | "system" | "public";

export const blockingBookingStatuses: readonly BookingStatus[] = ["pending", "confirmed"];
export const terminalBookingStatuses: readonly BookingStatus[] = [
  "cancelled_by_customer",
  "cancelled_by_business",
  "completed",
  "no_show",
  "expired",
];

const actorTransitions: Record<
  BookingActorRole,
  Partial<Record<BookingStatus, BookingStatus[]>>
> = {
  customer: {
    pending: ["cancelled_by_customer"],
    confirmed: ["cancelled_by_customer"],
  },
  shop: {
    pending: ["confirmed", "cancelled_by_business"],
    confirmed: ["completed", "no_show", "cancelled_by_business"],
  },
  admin: {
    pending: ["confirmed", "cancelled_by_business", "expired"],
    confirmed: ["completed", "no_show", "cancelled_by_business"],
  },
  system: {
    pending: ["expired"],
  },
  public: {},
};

export function isBookingBlockingStatus(status: BookingStatus) {
  return blockingBookingStatuses.includes(status);
}

export function isBookingTerminalStatus(status: BookingStatus) {
  return terminalBookingStatuses.includes(status);
}

export function isBookingCancelledStatus(status: BookingStatus) {
  return status === "cancelled_by_customer" || status === "cancelled_by_business";
}

export function getAllowedBookingStatusTransitions(
  currentStatus: BookingStatus,
  actorRole: BookingActorRole,
) {
  return actorTransitions[actorRole][currentStatus] ?? [];
}

export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  actorRole: BookingActorRole,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  return getAllowedBookingStatusTransitions(currentStatus, actorRole).includes(nextStatus);
}

export function getBookingTransitionErrorMessage(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  actorRole: BookingActorRole,
) {
  if (canTransitionBookingStatus(currentStatus, nextStatus, actorRole)) {
    return null;
  }

  if (isBookingTerminalStatus(currentStatus)) {
    return "This booking is already final and cannot change status anymore.";
  }

  switch (actorRole) {
    case "customer":
      return "Customers can only cancel their own future bookings.";
    case "shop":
      return "This booking cannot move to that status from the business dashboard.";
    case "admin":
      return "This booking cannot move to that status from the admin surface.";
    case "system":
      return "System maintenance can only expire pending bookings.";
    default:
      return "This booking status transition is not allowed.";
  }
}

export function getCancellationStatusForActor(
  actorRole: Exclude<BookingActorRole, "system" | "public">,
) {
  return actorRole === "customer" ? "cancelled_by_customer" : "cancelled_by_business";
}

export function canCustomerCancel(
  booking: Pick<Booking, "status" | "startAt">,
  now: number = Date.now(),
) {
  return canTransitionBookingStatus(booking.status, "cancelled_by_customer", "customer")
    && new Date(booking.startAt).getTime() > now;
}

export function canBusinessConfirm(booking: Pick<Booking, "status">) {
  return canTransitionBookingStatus(booking.status, "confirmed", "shop");
}

export function canBusinessReject(booking: Pick<Booking, "status">) {
  return canTransitionBookingStatus(booking.status, "cancelled_by_business", "shop");
}

export function canBusinessCancel(
  booking: Pick<Booking, "status" | "startAt">,
  now: number = Date.now(),
) {
  return canTransitionBookingStatus(booking.status, "cancelled_by_business", "shop")
    && new Date(booking.startAt).getTime() > now;
}

export function canBusinessComplete(booking: Pick<Booking, "status">) {
  return canTransitionBookingStatus(booking.status, "completed", "shop");
}

export function canMarkBookingNoShow(booking: Pick<Booking, "status">) {
  return canTransitionBookingStatus(booking.status, "no_show", "shop");
}

export function canRequestReschedule(
  booking: Pick<Booking, "status" | "startAt">,
  now: number = Date.now(),
) {
  return isBookingBlockingStatus(booking.status) && new Date(booking.startAt).getTime() > now;
}

export function rangesOverlap(
  left: { startAt: string; endAt: string },
  right: { startAt: string; endAt: string },
) {
  return (
    new Date(left.startAt).getTime() < new Date(right.endAt).getTime() &&
    new Date(left.endAt).getTime() > new Date(right.startAt).getTime()
  );
}

export function findBookingConflicts<
  T extends Pick<Booking, "businessId" | "startAt" | "endAt" | "status">
>(
  bookings: readonly T[],
  candidate: Pick<Booking, "businessId" | "startAt" | "endAt">,
) {
  return bookings.filter(
    (booking) =>
      booking.businessId === candidate.businessId &&
      isBookingBlockingStatus(booking.status) &&
      rangesOverlap(booking, candidate),
  );
}
