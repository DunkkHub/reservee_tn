import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { recordActivity } from "@/lib/activity-log-repository";
import {
  canAccessBookingPhone,
  canManageBusinessProfile,
} from "@/lib/access-control";
import { getApiSession } from "@/lib/auth-session";
import {
  findBookingById,
  requestBookingReschedule,
  updateBookingStatus,
} from "@/lib/booking-repository";
import { findBusinessById } from "@/lib/business-repository";
import { sendBookingCancellationNotifications, sendBookingConfirmedNotifications } from "@/lib/notifications/booking-notifications";
import { assertAllowedOrigin } from "@/lib/security";
import { findServiceById } from "@/lib/service-repository";
import type { Booking } from "@/lib/types";
import {
  bookingStatusUpdateSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function canAccessBooking(
  session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>,
  booking: Booking,
) {
  if (session.user.role === "admin") {
    return true;
  }

  if (session.user.role === "shop") {
    const business = await findBusinessById(booking.businessId);
    return Boolean(
      business && canManageBusinessProfile(session.user, business.ownerId),
    );
  }

  if (session.user.role === "customer") {
    return canAccessBookingPhone(session.user.phone, booking.customerPhone);
  }

  return false;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const { id } = await context.params;
    const booking = await findBookingById(id);

    if (!booking) {
      return errorResponse("Booking not found.", 404, "not_found");
    }

    if (!(await canAccessBooking(session, booking))) {
      return forbiddenResponse("You do not have permission to view this booking.");
    }

    return successResponse(booking);
  } catch (error) {
    return handleRouteError(error, "Unable to load this booking.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const { id } = await context.params;
    const booking = await findBookingById(id);

    if (!booking) {
      return errorResponse("Booking not found.", 404, "not_found");
    }

    if (!(await canAccessBooking(session, booking))) {
      return forbiddenResponse("You do not have permission to manage this booking.");
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(bookingStatusUpdateSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    if (parsed.data.action === "requestReschedule") {
      const updatedBooking = await requestBookingReschedule(id, {
        userId: session.user.id,
        role: session.user.role,
      });

      await recordActivity({
        type: "booking_reschedule_requested",
        businessId: booking.businessId,
        bookingId: booking.id,
        summary: `Customer requested a reschedule for ${booking.referenceCode}.`,
      });

      return successResponse(updatedBooking, "Reschedule requested.");
    }

    if (!parsed.data.status) {
      return errorResponse("Status is required.", 400, "invalid_input");
    }

    if (session.user.role === "customer" && parsed.data.status !== "cancelled_by_customer") {
      return forbiddenResponse("Customers can only cancel their own bookings.");
    }

    const reason =
      parsed.data.status === "cancelled_by_customer" ||
      parsed.data.status === "cancelled_by_business"
        ? session.user.role === "customer"
          ? "cancelled_by_customer"
          : session.user.role === "shop"
            ? "cancelled_by_business"
            : "cancelled_by_admin"
        : null;

    const updatedBooking = await updateBookingStatus(id, parsed.data.status, {
      userId: session.user.id,
      role: session.user.role,
      reason,
    });

    if (!updatedBooking) {
      return errorResponse("Booking not found.", 404, "not_found");
    }

    await recordActivity({
      type: "booking_status_changed",
      businessId: booking.businessId,
      bookingId: booking.id,
      summary: `Booking status changed to ${parsed.data.status}.`,
    });

    const [business, service] = await Promise.all([
      findBusinessById(booking.businessId),
      findServiceById(booking.serviceId),
    ]);

    if (business && service) {
      if (
        parsed.data.status === "cancelled_by_customer" ||
        parsed.data.status === "cancelled_by_business"
      ) {
        await sendBookingCancellationNotifications({
          booking: updatedBooking,
          business,
          service,
        });
      }

      if (parsed.data.status === "confirmed" && booking.status !== "confirmed") {
        await sendBookingConfirmedNotifications({
          booking: updatedBooking,
          business,
          service,
          customer: session.user.role === "customer" ? session.user : null,
        });
      }
    }

    return successResponse(updatedBooking, "Booking status updated.");
  } catch (error) {
    return handleRouteError(error, "Unable to update this booking.");
  }
}
