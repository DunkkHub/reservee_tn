import { NextResponse } from "next/server";
import {
  createBooking,
  checkSlotAvailability,
} from "@/lib/booking-repository";
import { findServiceById } from "@/lib/service-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import type { BookingStatus } from "@/lib/types";

export const runtime = "nodejs";

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

    // Validation
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

    if (!body.endAt) {
      return NextResponse.json(
        { ok: false, message: "End time is required" },
        { status: 400 },
      );
    }

    // Check service exists
    const service = await findServiceById(body.serviceId);
    if (!service) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 },
      );
    }

    // Check availability
    const isAvailable = await checkSlotAvailability({
      businessId: body.businessId,
      startAt: body.startAt,
      endAt: body.endAt,
    });

    if (!isAvailable) {
      return NextResponse.json(
        { ok: false, message: "This time slot is not available" },
        { status: 409 },
      );
    }

    // Determine initial status based on business booking mode
    // For now, default to 'pending' - this would come from business profile in real implementation
    const initialStatus: BookingStatus = "pending";

    const booking = await createBooking({
      businessId: body.businessId,
      serviceId: body.serviceId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerNote: body.customerNote,
      startAt: body.startAt,
      endAt: body.endAt,
      status: initialStatus,
      source: body.source ?? "web",
      expiresAt:
        initialStatus === "pending"
          ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          : null,
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
