import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity-log-repository";
import { paginatedResponse } from "@/lib/api-response";
import { getApiSession } from "@/lib/auth-session";
import {
  countBusinesses,
  findBusinesses,
  findBusinessById,
  moderateBusiness,
} from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getDbPool } from "@/lib/db";
import { createPaginationMetadata, parsePagination } from "@/lib/pagination";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, HttpRequestError } from "@/lib/security";
import type { CategorySlug, BusinessStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getApiSession();

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only admins can access this endpoint" },
        { status: session ? 403 : 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const pagination = parsePagination(searchParams);

    const filters = {
      citySlug: city ?? undefined,
      categorySlug: (category as CategorySlug | null) ?? undefined,
      statuses: status ? [status as BusinessStatus] : undefined,
    };
    const [businesses, total] = await Promise.all([
      findBusinesses({
        ...filters,
        ...pagination,
      }),
      countBusinesses(filters),
    ]);

    return paginatedResponse(
      businesses,
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

export async function PATCH(request: Request) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only admins can moderate businesses" },
        { status: session ? 403 : 401 },
      );
    }

    const rateLimit = await consumeRateLimit({
      key: `admin-business-moderation:${session.user.id}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 30,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many moderation updates. Please slow down and try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const body = (await request.json()) as {
      businessId?: string;
      status?: BusinessStatus;
      featuredUntil?: string | null;
      featuredRank?: number | null;
      internalNote?: string;
      businessMessage?: string;
    };

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (!body.status) {
      return NextResponse.json(
        { ok: false, message: "Status is required" },
        { status: 400 },
      );
    }

    const currentBusiness = await findBusinessById(body.businessId);

    if (!currentBusiness) {
      return NextResponse.json(
        { ok: false, message: "Business not found" },
        { status: 404 },
      );
    }

    const updated = await moderateBusiness(body.businessId, {
      status: body.status,
      featured_until: body.featuredUntil,
      featured_rank: body.featuredRank,
      featured_city_slug:
        body.status === "featured" ? currentBusiness.featuredCitySlug ?? currentBusiness.cityId.replace("city-", "") : null,
      featured_category_slug:
        body.status === "featured"
          ? currentBusiness.featuredCategorySlug ??
            (currentBusiness.categoryId.replace("cat-", "") as CategorySlug)
          : null,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Business not found" },
        { status: 404 },
      );
    }

    if (body.internalNote || body.businessMessage) {
      const pool = getDbPool();
      await pool.execute(
        `
          INSERT INTO moderation_history (id, business_id, status, internal_note, business_message, changed_at)
          VALUES (UUID(), ?, ?, ?, ?, NOW())
        `,
        [body.businessId, body.status, body.internalNote ?? "", body.businessMessage ?? ""],
      );
    }

    await recordActivity({
      type: body.status === "featured" ? "business_featured" : "business_status_changed",
      businessId: body.businessId,
      summary: `Business moderation moved to ${body.status}.`,
    });

    return NextResponse.json({
      ok: true,
      message: "Business moderation updated",
      data: updated,
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
