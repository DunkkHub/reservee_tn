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
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getApiSession } from "@/lib/auth-session";
import type { BreakWindow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const type = searchParams.get("type");

    if (!businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
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

    return NextResponse.json({
      ok: true,
      message: "Blocked slot deleted",
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
