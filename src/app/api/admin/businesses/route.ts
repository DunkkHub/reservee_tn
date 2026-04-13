import { NextResponse } from "next/server";
import { getDbPool, getDatabaseErrorMessage } from "@/lib/db";
import { moderateBusiness } from "@/lib/business-repository";
import { getApiSession } from "@/lib/auth-session";
import type { RowDataPacket } from "mysql2/promise";
import type { BusinessStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Auth check: Only admins can view moderation queue
    const session = await getApiSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only admins can access this endpoint" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const pool = getDbPool();

    let query =
      "SELECT id, business_name, slug, status, created_at FROM business_profiles";
    const params: unknown[] = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [businesses] = await pool.query<RowDataPacket[]>(query, params);

    return NextResponse.json({
      ok: true,
      data: businesses,
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
    // Auth check: Only admins can moderate businesses
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only admins can moderate businesses" },
        { status: 403 },
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

    const updated = await moderateBusiness(body.businessId, {
      status: body.status,
      featured_until: body.featuredUntil,
      featured_rank: body.featuredRank,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Business not found" },
        { status: 404 },
      );
    }

    // Store moderation record
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

    return NextResponse.json({
      ok: true,
      message: "Business moderation updated",
      data: updated,
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
