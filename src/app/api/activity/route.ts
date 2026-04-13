import { NextResponse } from "next/server";

import { findActivityLogs } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById, findBusinessByOwner } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";

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

    if (session.user.role === "customer") {
      return NextResponse.json(
        { ok: false, message: "Customers cannot access activity logs" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const limit = Number(searchParams.get("limit") ?? "80");

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
          { ok: false, message: "You don't have permission to access that business activity" },
          { status: 403 },
        );
      }

      const activity = await findActivityLogs({
        businessId: ownedBusiness.id,
        limit,
      });

      return NextResponse.json({
        ok: true,
        data: activity,
      });
    }

    const activity = await findActivityLogs({
      businessId: businessId ?? undefined,
      limit,
    });

    return NextResponse.json({
      ok: true,
      data: activity,
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
