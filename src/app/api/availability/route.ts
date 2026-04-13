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
import { getDatabaseErrorMessage } from "@/lib/db";
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

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (body.type === "hours") {
      if (body.dayOfWeek === undefined) {
        return NextResponse.json(
          { ok: false, message: "Day of week is required" },
          { status: 400 },
        );
      }

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

    if (!businessId || !slotId) {
      return NextResponse.json(
        { ok: false, message: "Business ID and slot ID are required" },
        { status: 400 },
      );
    }

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
