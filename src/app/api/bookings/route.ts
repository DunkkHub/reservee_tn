import { addMinutes } from "date-fns";

import {
  conflictResponse,
  errorResponse,
  forbiddenResponse,
  rateLimitResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { getApiSession } from "@/lib/auth-session";
import {
  createBooking,
  expireOldBookings,
  findAllBookings,
  findBookingsByBusiness,
  findBookingsByPhone,
} from "@/lib/booking-repository";
import { recordActivity } from "@/lib/activity-log-repository";
import {
  generateAvailableSlots,
  SAME_DAY_BOOKING_LEAD_MINUTES,
} from "@/lib/availability";
import { findBusinessById, findBusinessByOwner } from "@/lib/business-repository";
import { getBookingExpiryAt } from "@/lib/platform-rules";
import { sendBookingCreatedNotifications } from "@/lib/notifications/booking-notifications";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import { findServiceById } from "@/lib/service-repository";
import type { BookingStatus } from "@/lib/types";
import {
  bookingCreateSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const customerPhone = searchParams.get("customerPhone");

    if (session.user.role === "customer") {
      const bookings = await findBookingsByPhone(session.user.phone);
      return successResponse(bookings);
    }

    if (session.user.role === "shop") {
      const ownedBusiness =
        (session.user.businessProfileId
          ? await findBusinessById(session.user.businessProfileId)
          : null) ?? (await findBusinessByOwner(session.user.id));

      if (!ownedBusiness) {
        return errorResponse(
          "Business profile not found for this shop account.",
          404,
          "not_found",
        );
      }

      if (businessId && businessId !== ownedBusiness.id) {
        return forbiddenResponse("You do not have permission to view those bookings.");
      }

      const bookings = await findBookingsByBusiness(ownedBusiness.id);
      return successResponse(bookings);
    }

    if (session.user.role === "admin") {
      if (businessId) {
        return successResponse(await findBookingsByBusiness(businessId));
      }

      if (customerPhone) {
        return successResponse(await findBookingsByPhone(customerPhone));
      }

      return successResponse(await findAllBookings());
    }

    return errorResponse(
      "Provide businessId or customerPhone for privileged booking lookups.",
      400,
      "invalid_input",
    );
  } catch (error) {
    return handleRouteError(error, "Unable to load bookings.");
  }
}

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const body = await request.json();
    const parsed = safeParseWithSchema(bookingCreateSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const session = await getApiSession();
    const rateLimit = await consumeRateLimit({
      key: `booking-create:${session?.user.id ?? getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: parsed.data.source === "dashboard" ? 20 : 8,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(
        "Too many booking attempts. Please try again shortly.",
        rateLimit.resetAt,
      );
    }

    if (parsed.data.source === "dashboard") {
      if (!session) {
        return unauthorizedResponse("Authentication required for dashboard bookings.");
      }

      if (session.user.role !== "shop" && session.user.role !== "admin") {
        return forbiddenResponse(
          "Only shop owners and admins can create dashboard bookings.",
        );
      }
    }

    const business = await findBusinessById(parsed.data.businessId);

    if (!business) {
      return errorResponse("Business not found.", 404, "not_found");
    }

    if (session?.user.role === "shop" && business.ownerId !== session.user.id) {
      return forbiddenResponse(
        "You do not have permission to create bookings for this business.",
      );
    }

    const [service, existingBookings] = await Promise.all([
      findServiceById(parsed.data.serviceId),
      findBookingsByBusiness(parsed.data.businessId),
    ]);

    if (!service) {
      return errorResponse("Service not found.", 404, "not_found");
    }

    if (service.businessId !== parsed.data.businessId) {
      return errorResponse(
        "Service does not belong to the specified business.",
        400,
        "invalid_input",
      );
    }

    if (!service.active) {
      return conflictResponse("This service is not currently bookable.");
    }

    const startAtDate = new Date(parsed.data.startAt);
    const earliestAllowedStart = Date.now() + SAME_DAY_BOOKING_LEAD_MINUTES * 60 * 1000;

    if (startAtDate.getTime() < earliestAllowedStart) {
      return errorResponse(
        `Same-day bookings must start at least ${SAME_DAY_BOOKING_LEAD_MINUTES} minutes from now.`,
        400,
        "invalid_input",
      );
    }

    const endAt = addMinutes(startAtDate, service.durationMinutes).toISOString();
    const isRequestedSlotAvailable = generateAvailableSlots(
      business,
      service,
      existingBookings,
      startAtDate,
    ).some((slot) => slot.getTime() === startAtDate.getTime());

    if (!isRequestedSlotAvailable) {
      return conflictResponse("This time slot is no longer available.");
    }

    const initialStatus: BookingStatus =
      business.bookingMode === "instant" ? "confirmed" : "pending";
    const createdAt = new Date().toISOString();

    const booking = await createBooking({
      businessId: parsed.data.businessId,
      serviceId: parsed.data.serviceId,
      customerUserId: session?.user.role === "customer" ? session.user.id : null,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerNote: parsed.data.customerNote,
      startAt: startAtDate.toISOString(),
      endAt,
      status: initialStatus,
      source: parsed.data.source ?? "web",
      expiresAt:
        initialStatus === "pending"
          ? getBookingExpiryAt(createdAt, startAtDate.toISOString())
          : null,
      actorUserId: session?.user.id ?? null,
      actorRole:
        session?.user.role === "customer"
          ? "customer"
          : session?.user.role === "shop"
            ? "shop"
            : session?.user.role === "admin"
              ? "admin"
              : "public",
    });

    if (!booking.ok || !booking.booking) {
      return errorResponse(
        booking.error ?? "Unable to create this booking.",
        booking.status,
        "conflict",
      );
    }

    await recordActivity({
      type: "booking_created",
      businessId: parsed.data.businessId,
      bookingId: booking.booking.id,
      actorUserId: session?.user.id ?? null,
      summary: `Booking ${booking.booking.referenceCode} created with ${initialStatus} status.`,
    });

    await sendBookingCreatedNotifications({
      booking: booking.booking,
      business,
      service,
      customer: session?.user.role === "customer" ? session.user : null,
    });

    return successResponse(booking.booking, "Booking created successfully", booking.status);
  } catch (error) {
    return handleRouteError(error, "Unable to create the booking.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session || session.user.role !== "admin") {
      return session
        ? forbiddenResponse("Only admins can run bulk booking maintenance.")
        : unauthorizedResponse("Authentication required.");
    }

    const body = (await request.json()) as { action?: "expireOld" };

    if (body.action !== "expireOld") {
      return errorResponse("Unsupported booking batch action.", 400, "invalid_input");
    }

    await expireOldBookings();
    return successResponse({ expired: true }, "Expired old bookings.");
  } catch (error) {
    return handleRouteError(error, "Unable to run booking maintenance.");
  }
}
