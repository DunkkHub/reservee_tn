import { NextResponse } from "next/server";

import {
  normalizePhone,
  parseBookingReferenceAccessToken,
} from "@/lib/booking-reference-access";
import {
  findBookingByReference,
  requestBookingReschedule,
  updateBookingStatus,
} from "@/lib/booking-repository";
import { recordActivity } from "@/lib/activity-log-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  assertAllowedOrigin,
  getClientIp,
  HttpRequestError,
} from "@/lib/security";

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
      return NextResponse.json(
        {
          ok: false,
          message: "Too many booking lookups. Please try again in a few minutes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const parsedToken = await parseBookingReferenceAccessToken(token);

    if (!parsedToken || parsedToken.referenceCode !== referenceCode.toUpperCase()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Booking verification required. Request and verify a code first.",
        },
        { status: 401 },
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (
      !booking ||
      normalizePhone(booking.customerPhone) !== parsedToken.customerPhone
    ) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: booking,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  } catch (error) {
    if (error instanceof HttpRequestError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
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
      return NextResponse.json(
        {
          ok: false,
          message: "Booking verification required. Request and verify a code first.",
        },
        { status: 401 },
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (
      !booking ||
      normalizePhone(booking.customerPhone) !== parsedToken.customerPhone
    ) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
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

      return NextResponse.json({
        ok: true,
        message: "Reschedule requested",
        data: updated,
      });
    }

    if (body.action !== "cancel") {
      return NextResponse.json(
        { ok: false, message: "Unsupported booking action" },
        { status: 400 },
      );
    }

    const updated = await updateBookingStatus(booking.id, "cancelled", {
      role: "customer",
      reason: "cancelled_by_customer",
    });

    await recordActivity({
      type: "booking_status_changed",
      businessId: booking.businessId,
      bookingId: booking.id,
      summary: `Customer cancelled booking ${booking.referenceCode}.`,
    });

    return NextResponse.json({
      ok: true,
      message: "Booking cancelled",
      data: updated,
    });
  } catch (error) {
    if (error instanceof HttpRequestError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
