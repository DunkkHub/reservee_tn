import { NextResponse } from "next/server";
import {
  findBookingById,
  findBookingByReference,
  findBookingsByBusiness,
  findBookingsByPhone,
  updateBookingStatus,
  requestBookingReschedule,
  expireOldBookings,
} from "@/lib/booking-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import type { BookingStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const reference = searchParams.get("reference");
    const businessId = searchParams.get("businessId");
    const customerPhone = searchParams.get("customerPhone");

    let booking;

    if (id) {
      booking = await findBookingById(id);
    } else if (reference) {
      booking = await findBookingByReference(reference);
    } else if (businessId) {
      const bookings = await findBookingsByBusiness(businessId);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    } else if (customerPhone) {
      const bookings = await findBookingsByPhone(customerPhone);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    } else {
      return NextResponse.json(
        { ok: false, message: "Please provide id, reference, businessId, or customerPhone" },
        { status: 400 },
      );
    }

    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      bookingId?: string;
      status?: BookingStatus;
      action?: "updateStatus" | "requestReschedule" | "expireOld";
    };

    if (body.action === "expireOld") {
      await expireOldBookings();
      return NextResponse.json({
        ok: true,
        message: "Expired old bookings",
      });
    }

    if (!body.bookingId) {
      return NextResponse.json(
        { ok: false, message: "Booking ID is required" },
        { status: 400 },
      );
    }

    if (body.action === "requestReschedule") {
      const booking = await requestBookingReschedule(body.bookingId);
      return NextResponse.json({
        ok: true,
        message: "Reschedule requested",
        data: booking,
      });
    }

    if (!body.status) {
      return NextResponse.json(
        { ok: false, message: "Status is required" },
        { status: 400 },
      );
    }

    const booking = await updateBookingStatus(body.bookingId, body.status);

    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Booking status updated",
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
