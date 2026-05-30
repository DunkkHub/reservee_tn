import { NextResponse } from "next/server";

import { countActivityLogs, findActivityLogs } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById, findBusinessByOwner } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { paginatedResponse } from "@/lib/api-response";
import { createPaginationMetadata, parsePagination } from "@/lib/pagination";

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
    const pagination = parsePagination(searchParams, { defaultLimit: 80 });

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

      const [activity, total] = await Promise.all([
        findActivityLogs({
          businessId: ownedBusiness.id,
          ...pagination,
        }),
        countActivityLogs({ businessId: ownedBusiness.id }),
      ]);

      return paginatedResponse(
        activity,
        createPaginationMetadata(total, pagination),
      );
    }

    const [activity, total] = await Promise.all([
      findActivityLogs({
        businessId: businessId ?? undefined,
        ...pagination,
      }),
      countActivityLogs({ businessId: businessId ?? undefined }),
    ]);

    return paginatedResponse(
      activity,
      createPaginationMetadata(total, pagination),
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
