import { NextResponse } from "next/server";
import {
  findBusinessHours,
  updateBusinessHours,
  ensureBusinessHoursExist,
} from "@/lib/business-hours-repository";
import {
  findBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
} from "@/lib/blocked-slots-repository";
import { recordActivity } from "@/lib/activity-log-repository";
import {
  findNextAvailableSlot,
  generateAvailableSlots,
  parseDateKey,
} from "@/lib/availability";
import { findBookingsByBusiness } from "@/lib/booking-repository";
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getApiSession } from "@/lib/auth-session";
import { assertAllowedOrigin, HttpRequestError } from "@/lib/security";
import { findServiceById } from "@/lib/service-repository";
import type { BreakWindow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const type = searchParams.get("type");
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date");

    if (!businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (type === "slots" || type === "next") {
      if (!serviceId) {
        return NextResponse.json(
          { ok: false, message: "Service ID is required" },
          { status: 400 },
        );
      }

      const [business, service, bookings] = await Promise.all([
        findBusinessById(businessId),
        findServiceById(serviceId),
        findBookingsByBusiness(businessId),
      ]);

      if (!business || !service || service.businessId !== businessId) {
        return NextResponse.json(
          { ok: false, message: "Business or service not found" },
          { status: 404 },
        );
      }

      if (!service.active) {
        return NextResponse.json({
          ok: true,
          data: type === "slots" ? [] : null,
        });
      }

      if (type === "next") {
        const nextSlot = findNextAvailableSlot(business, service, bookings, 14);
        return NextResponse.json({
          ok: true,
          data: nextSlot?.toISOString() ?? null,
        });
      }

      if (!date) {
        return NextResponse.json(
          { ok: false, message: "Date is required for slot lookups" },
          { status: 400 },
        );
      }

      const selectedDate = parseDateKey(date, business.timezone);

      if (!selectedDate) {
        return NextResponse.json(
          { ok: false, message: "Date must be valid" },
          { status: 400 },
        );
      }

      const slots = generateAvailableSlots(business, service, bookings, selectedDate).map((slot) =>
        slot.toISOString(),
      );

      return NextResponse.json({
        ok: true,
        data: slots,
      });
    }

    if (type === "hours") {
      await ensureBusinessHoursExist(businessId);
      const hours = await findBusinessHours(businessId);
      return NextResponse.json({
        ok: true,
        data: hours,
      });
    }

    if (type === "blocked") {
      const blocked = await findBlockedSlots(businessId);
      return NextResponse.json({
        ok: true,
        data: blocked,
      });
    }

    // Default: return both
    await ensureBusinessHoursExist(businessId);
    const hours = await findBusinessHours(businessId);
    const blocked = await findBlockedSlots(businessId);

    return NextResponse.json({
      ok: true,
      data: {
        hours,
        blocked,
      },
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

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const body = (await request.json()) as {
      businessId?: string;
      type?: "hours" | "blocked";
      dayOfWeek?: number;
      openTime?: string;
      closeTime?: string;
      isClosed?: boolean;
      breaks?: BreakWindow[];
      startAt?: string;
      endAt?: string;
      reason?: string;
    };

    // Auth check: Updating availability requires authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    // Ownership check: Verify user owns the business
    if (session.user.role === "shop") {
      const business = await findBusinessById(body.businessId);
      if (!business || business.ownerId !== session.user.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to update availability for this business" },
          { status: 403 },
        );
      }
    }
    // Admins can update any business's availability

    if (body.type === "hours") {
      if (body.dayOfWeek === undefined) {
        return NextResponse.json(
          { ok: false, message: "Day of week is required" },
          { status: 400 },
        );
      }

      await ensureBusinessHoursExist(body.businessId);
      await updateBusinessHours(body.businessId, body.dayOfWeek, {
        openTime: body.openTime,
        closeTime: body.closeTime,
        isClosed: body.isClosed,
        breaks: body.breaks,
      });

      const hours = await findBusinessHours(body.businessId);

      await recordActivity({
        type: "business_settings_edited",
        businessId: body.businessId,
        summary: "Opening hours were updated.",
      });

      return NextResponse.json(
        {
          ok: true,
          message: "Business hours updated",
          data: hours,
        },
        { status: 200 },
      );
    }

    if (body.type === "blocked") {
      if (!body.startAt || !body.endAt) {
        return NextResponse.json(
          { ok: false, message: "Start and end times are required" },
          { status: 400 },
        );
      }

      const slot = await createBlockedSlot({
        businessId: body.businessId,
        startAt: body.startAt,
        endAt: body.endAt,
        reason: body.reason ?? "",
      });

      await recordActivity({
        type: "business_settings_edited",
        businessId: body.businessId,
        summary: "A blocked slot was added.",
      });

      return NextResponse.json(
        {
          ok: true,
          message: "Blocked slot created",
          data: slot,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Type must be 'hours' or 'blocked'" },
      { status: 400 },
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

export async function DELETE(request: Request) {
  try {
    assertAllowedOrigin(request);

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const slotId = searchParams.get("slotId");

    // Auth check: Deleting availability requires authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (!businessId || !slotId) {
      return NextResponse.json(
        { ok: false, message: "Business ID and slot ID are required" },
        { status: 400 },
      );
    }

    // Ownership check: Verify user owns the business
    if (session.user.role === "shop") {
      const business = await findBusinessById(businessId);
      if (!business || business.ownerId !== session.user.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to delete availability for this business" },
          { status: 403 },
        );
      }
    }
    // Admins can delete any business's availability

    await deleteBlockedSlot(slotId, businessId);

    await recordActivity({
      type: "business_settings_edited",
      businessId,
      summary: "A blocked slot was removed.",
    });

    return NextResponse.json({
      ok: true,
      message: "Blocked slot deleted",
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
