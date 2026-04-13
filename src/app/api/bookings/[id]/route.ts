import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import {
  findBookingById,
  requestBookingReschedule,
  updateBookingStatus,
} from "@/lib/booking-repository";
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import type { Booking, BookingStatus } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function canAccessBooking(session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>, booking: Booking) {
  if (session.user.role === "admin") {
    return true;
  }

  if (session.user.role === "shop") {
    const business = await findBusinessById(booking.businessId);
    return Boolean(business && business.ownerId === session.user.id);
  }

  if (session.user.role === "customer") {
    return normalizePhone(session.user.phone) === normalizePhone(booking.customerPhone);
  }

  return false;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await getApiSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const booking = await findBookingById(id);

    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    if (!(await canAccessBooking(session, booking))) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to view this booking" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: booking,
    });
  } catch (error) {
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
    const session = await getApiSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: BookingStatus;
      action?: "updateStatus" | "requestReschedule";
    };

    const booking = await findBookingById(id);

    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    if (!(await canAccessBooking(session, booking))) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to manage this booking" },
        { status: 403 },
      );
    }

    if (body.action === "requestReschedule") {
      const updatedBooking = await requestBookingReschedule(id);

      await recordActivity({
        type: "booking_reschedule_requested",
        businessId: booking.businessId,
        bookingId: booking.id,
        summary: `Customer requested a reschedule for ${booking.referenceCode}.`,
      });

      return NextResponse.json({
        ok: true,
        message: "Reschedule requested",
        data: updatedBooking,
      });
    }

    if (!body.status) {
      return NextResponse.json(
        { ok: false, message: "Status is required" },
        { status: 400 },
      );
    }

    if (session.user.role === "customer" && body.status !== "cancelled_by_customer") {
      return NextResponse.json(
        { ok: false, message: "Customers can only cancel their own bookings" },
        { status: 403 },
      );
    }

    const updatedBooking = await updateBookingStatus(id, body.status);

    if (!updatedBooking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    await recordActivity({
      type: "booking_status_changed",
      businessId: booking.businessId,
      bookingId: booking.id,
      summary: `Booking status changed to ${body.status}.`,
    });

    return NextResponse.json({
      ok: true,
      message: "Booking status updated",
      data: updatedBooking,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
