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
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getApiSession } from "@/lib/auth-session";
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

    // Auth check: All write operations require authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (body.action === "expireOld") {
      // Only admins can expire old bookings
      if (session.user.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Only admins can expire old bookings" },
          { status: 403 },
        );
      }
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

    // Get the booking to verify ownership
    const booking = await findBookingById(body.bookingId);
    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    // Ownership check: shop owners can only manage their own business's bookings
    if (session.user.role === "shop") {
      const business = await findBusinessById(booking.businessId);
      if (!business || business.ownerId !== session.user.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to manage this booking" },
          { status: 403 },
        );
      }
    }
    // Admins can manage any booking

    if (body.action === "requestReschedule") {
      const updatedBooking = await requestBookingReschedule(body.bookingId);
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

    const updatedBooking = await updateBookingStatus(body.bookingId, body.status);

    if (!updatedBooking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

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
