import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { recordActivity } from "@/lib/activity-log-repository";
import {
  normalizePhone,
  parseBookingReferenceAccessToken,
} from "@/lib/booking-reference-access";
import {
  findBookingByReference,
  requestBookingReschedule,
  updateBookingStatus,
} from "@/lib/booking-repository";
import { findBusinessById } from "@/lib/business-repository";
import { sendBookingCancellationNotifications } from "@/lib/notifications/booking-notifications";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import { findServiceById } from "@/lib/service-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    referenceCode: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { referenceCode } = await context.params;
    const token = new URL(request.url).searchParams.get("token");
    const rateLimit = await consumeRateLimit({
      key: `public-booking-reference-read:${getClientIp(request)}`,
      windowMs: 5 * 60 * 1000,
      maxRequests: 20,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(
        "Too many booking lookups. Please try again in a few minutes.",
        rateLimit.resetAt,
      );
    }

    const parsedToken = await parseBookingReferenceAccessToken(token);

    if (!parsedToken || parsedToken.referenceCode !== referenceCode.toUpperCase()) {
      return unauthorizedResponse(
        "Booking verification required. Request and verify a code first.",
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (!booking || normalizePhone(booking.customerPhone) !== parsedToken.customerPhone) {
      return errorResponse("Booking not found.", 404, "not_found");
    }

    return successResponse(
      booking,
      "Booking loaded.",
      200,
      {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    );
  } catch (error) {
    return handleRouteError(error, "Unable to load this booking.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertAllowedOrigin(request);

    const { referenceCode } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const parsedToken = await parseBookingReferenceAccessToken(token);

    if (!parsedToken || parsedToken.referenceCode !== referenceCode.toUpperCase()) {
      return unauthorizedResponse(
        "Booking verification required. Request and verify a code first.",
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (!booking || normalizePhone(booking.customerPhone) !== parsedToken.customerPhone) {
      return errorResponse("Booking not found.", 404, "not_found");
    }

    const body = (await request.json()) as {
      action?: "cancel" | "requestReschedule";
    };

    if (body.action === "requestReschedule") {
      const updated = await requestBookingReschedule(booking.id, {
        role: "customer",
      });

      await recordActivity({
        type: "booking_reschedule_requested",
        businessId: booking.businessId,
        bookingId: booking.id,
        summary: `Customer requested a reschedule for ${booking.referenceCode}.`,
      });

      return successResponse(updated, "Reschedule requested.");
    }

    if (body.action !== "cancel") {
      return errorResponse("Unsupported booking action.", 400, "invalid_input");
    }

    const updated = await updateBookingStatus(booking.id, "cancelled_by_customer", {
      role: "customer",
      reason: "cancelled_by_customer",
    });

    await recordActivity({
      type: "booking_status_changed",
      businessId: booking.businessId,
      bookingId: booking.id,
      summary: `Customer cancelled booking ${booking.referenceCode}.`,
    });

    const [business, service] = await Promise.all([
      findBusinessById(booking.businessId),
      findServiceById(booking.serviceId),
    ]);

    if (business && service && updated) {
      await sendBookingCancellationNotifications({
        booking: updated,
        business,
        service,
      });
    }

    return successResponse(updated, "Booking cancelled.");
  } catch (error) {
    return handleRouteError(error, "Unable to manage this booking.");
  }
}
