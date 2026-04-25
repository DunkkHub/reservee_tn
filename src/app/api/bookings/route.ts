import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";

import {
  checkSlotAvailability,
  createBooking,
  expireOldBookings,
  findAllBookings,
  findBookingsByBusiness,
  findBookingsByPhone,
} from "@/lib/booking-repository";
import { recordActivity } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById, findBusinessByOwner } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getBookingExpiryAt } from "@/lib/platform-rules";
import { findServiceById } from "@/lib/service-repository";
import type { BookingStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getApiSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const customerPhone = searchParams.get("customerPhone");

    if (session.user.role === "customer") {
      const bookings = await findBookingsByPhone(session.user.phone);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    }

    if (session.user.role === "shop") {
      const ownedBusiness =
        (session.user.businessProfileId
          ? await findBusinessById(session.user.businessProfileId)
          : null) ?? (await findBusinessByOwner(session.user.id));

      if (!ownedBusiness) {
        return NextResponse.json(
          { ok: false, message: "Business profile not found for this shop account" },
          { status: 404 },
        );
      }

      if (businessId && businessId !== ownedBusiness.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to view those bookings" },
          { status: 403 },
        );
      }

      const bookings = await findBookingsByBusiness(ownedBusiness.id);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    }

    if (businessId) {
      const bookings = await findBookingsByBusiness(businessId);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    }

    if (customerPhone) {
      const bookings = await findBookingsByPhone(customerPhone);
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    }

    if (session.user.role === "admin") {
      const bookings = await findAllBookings();
      return NextResponse.json({
        ok: true,
        data: bookings,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Provide businessId or customerPhone for admin booking lookups" },
      { status: 400 },
    );
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      serviceId?: string;
      customerName?: string;
      customerPhone?: string;
      customerNote?: string;
      startAt?: string;
      endAt?: string;
      source?: "web" | "dashboard";
    };

    const session = body.source === "dashboard" ? await getApiSession() : null;

    if (body.source === "dashboard") {
      if (!session) {
        return NextResponse.json(
          { ok: false, message: "Authentication required for dashboard bookings" },
          { status: 401 },
        );
      }

      if (session.user.role !== "shop" && session.user.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Only shop owners and admins can create dashboard bookings" },
          { status: 403 },
        );
      }
    }

    if (!body.businessId?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (!body.serviceId?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Service ID is required" },
        { status: 400 },
      );
    }

    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Customer name is required" },
        { status: 400 },
      );
    }

    if (!body.customerPhone?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Customer phone is required" },
        { status: 400 },
      );
    }

    if (!body.startAt) {
      return NextResponse.json(
        { ok: false, message: "Start time is required" },
        { status: 400 },
      );
    }

    const business = await findBusinessById(body.businessId);

    if (!business) {
      return NextResponse.json(
        { ok: false, message: "Business not found" },
        { status: 404 },
      );
    }

    if (session?.user.role === "shop" && business.ownerId !== session.user.id) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to create bookings for this business" },
        { status: 403 },
      );
    }

    const service = await findServiceById(body.serviceId);

    if (!service) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 },
      );
    }

    if (service.businessId !== body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Service does not belong to the specified business" },
        { status: 400 },
      );
    }

    if (!service.active) {
      return NextResponse.json(
        { ok: false, message: "This service is not currently bookable" },
        { status: 409 },
      );
    }

    const startAtDate = new Date(body.startAt);

    if (Number.isNaN(startAtDate.getTime())) {
      return NextResponse.json(
        { ok: false, message: "Start time must be a valid ISO date" },
        { status: 400 },
      );
    }

    // Allow a 2-minute buffer for booking form completion
    const bufferMs = 2 * 60 * 1000;
    if (startAtDate.getTime() < Date.now() - bufferMs) {
      return NextResponse.json(
        { ok: false, message: "Start time cannot be in the past" },
        { status: 400 },
      );
    }

    const endAt = addMinutes(startAtDate, service.durationMinutes).toISOString();

    const isAvailable = await checkSlotAvailability({
      businessId: body.businessId,
      startAt: startAtDate.toISOString(),
      endAt,
    });

    if (!isAvailable) {
      return NextResponse.json(
        { ok: false, message: "This time slot is not available" },
        { status: 409 },
      );
    }

    const initialStatus: BookingStatus =
      business.bookingMode === "instant" ? "confirmed" : "pending";
    const createdAt = new Date().toISOString();

    const booking = await createBooking({
      businessId: body.businessId,
      serviceId: body.serviceId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerNote: body.customerNote,
      startAt: startAtDate.toISOString(),
      endAt,
      status: initialStatus,
      source: body.source ?? "web",
      expiresAt:
        initialStatus === "pending"
          ? getBookingExpiryAt(createdAt, startAtDate.toISOString())
          : null,
    });

    await recordActivity({
      type: "booking_created",
      businessId: body.businessId,
      bookingId: booking?.id,
      summary: `Booking ${booking?.referenceCode ?? ""} created with ${initialStatus} status.`,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Booking created successfully",
        data: booking,
      },
      { status: 201 },
    );
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
    const session = await getApiSession();

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only admins can run bulk booking maintenance" },
        { status: session ? 403 : 401 },
      );
    }

    const body = (await request.json()) as {
      action?: "expireOld";
    };

    if (body.action !== "expireOld") {
      return NextResponse.json(
        { ok: false, message: "Unsupported booking batch action" },
        { status: 400 },
      );
    }

    await expireOldBookings();

    return NextResponse.json({
      ok: true,
      message: "Expired old bookings",
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
