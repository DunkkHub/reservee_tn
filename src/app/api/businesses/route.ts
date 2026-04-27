import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import {
  findBusinesses,
  findBusinessById,
  findBusinessByOwner,
  findPublicBusinesses,
  incrementBusinessProfileViews,
  updateBusinessProfile,
} from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { assertAllowedOrigin, HttpRequestError } from "@/lib/security";
import type {
  BookingMode,
  BusinessPolicy,
  BusinessStatus,
  BusinessTrust,
  CategorySlug,
  OperatingMode,
} from "@/lib/types";

export const runtime = "nodejs";

type Scope = "public" | "owner" | "admin";

function isLiveStatus(status: BusinessStatus) {
  return status === "approved" || status === "featured";
}

export async function GET(request: Request) {
  try {
    const session = await getApiSession();
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") as Scope | null) ?? "public";
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");
    const ownerId = searchParams.get("ownerId");
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const status = searchParams.getAll("status") as BusinessStatus[];
    const limit = Number(searchParams.get("limit") ?? "100");
    const incrementView = searchParams.get("incrementView") === "1";

    if (scope === "owner") {
      if (!session || session.user.role !== "shop") {
        return NextResponse.json(
          { ok: false, message: "Only shop accounts can access owner business data" },
          { status: session ? 403 : 401 },
        );
      }

      const business =
        (session.user.businessProfileId
          ? await findBusinessById(session.user.businessProfileId)
          : null) ?? (await findBusinessByOwner(session.user.id));

      if (!business) {
        return NextResponse.json(
          { ok: false, message: "Business profile not found for this shop account" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: business,
      });
    }

    if (scope === "admin") {
      if (!session || session.user.role !== "admin") {
        return NextResponse.json(
          { ok: false, message: "Only admins can access admin business data" },
          { status: session ? 403 : 401 },
        );
      }

      const businesses = await findBusinesses({
        ids: id ? [id] : undefined,
        slug: slug ?? undefined,
        ownerUserId: ownerId ?? undefined,
        citySlug: city ?? undefined,
        categorySlug: (category as CategorySlug | null) ?? undefined,
        statuses: status.length > 0 ? status : undefined,
        limit,
      });

      return NextResponse.json({
        ok: true,
        data: id || slug || ownerId ? businesses[0] ?? null : businesses,
      });
    }

    if (id) {
      const business = await findBusinessById(id);

      if (!business || !isLiveStatus(business.status)) {
        return NextResponse.json(
          { ok: false, message: "Business not found" },
          { status: 404 },
        );
      }

      if (incrementView) {
        await incrementBusinessProfileViews(business.id);
      }

      return NextResponse.json({
        ok: true,
        data: business,
      });
    }

    if (slug) {
      const business = (await findBusinesses({ slug, statuses: ["approved", "featured"], limit: 1 }))[0];

      if (!business) {
        return NextResponse.json(
          { ok: false, message: "Business not found" },
          { status: 404 },
        );
      }

      if (incrementView) {
        await incrementBusinessProfileViews(business.id);
      }

      return NextResponse.json({
        ok: true,
        data: business,
      });
    }

    const businesses = await findPublicBusinesses({
      citySlug: city ?? undefined,
      categorySlug: (category as CategorySlug | null) ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      data: businesses.slice(0, limit),
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
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      businessId?: string;
      name?: string;
      area?: string;
      address?: string;
      phone?: string;
      whatsapp?: string;
      instagram?: string;
      tagline?: string;
      description?: string;
      logoText?: string;
      coverUrl?: string;
      audience?: "women" | "men" | "unisex";
      yearsInBusiness?: number;
      responseWindow?: string;
      bookingMode?: BookingMode;
      operatingMode?: OperatingMode;
      status?: BusinessStatus;
      trust?: Partial<BusinessTrust>;
      policies?: Partial<BusinessPolicy>;
    };

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
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

    if (session.user.role === "shop" && currentBusiness.ownerId !== session.user.id) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to update this business" },
        { status: 403 },
      );
    }

    if (session.user.role === "customer") {
      return NextResponse.json(
        { ok: false, message: "Customers cannot update business profiles" },
        { status: 403 },
      );
    }

    if (
      session.user.role === "shop" &&
      body.status &&
      body.status !== "pending_review" &&
      body.status !== currentBusiness.status
    ) {
      return NextResponse.json(
        { ok: false, message: "Shop accounts can only submit their profile for review" },
        { status: 403 },
      );
    }

    const updated = await updateBusinessProfile(body.businessId, {
      business_name: body.name,
      area: body.area,
      address: body.address,
      phone: body.phone,
      whatsapp: body.whatsapp,
      instagram: body.instagram,
      tagline: body.tagline,
      description: body.description,
      logo_text: body.logoText,
      cover_url: body.coverUrl,
      audience: body.audience,
      years_in_business: body.yearsInBusiness,
      response_window: body.responseWindow,
      booking_mode: body.bookingMode,
      operating_mode: body.operatingMode,
      status: body.status,
      phone_verified: body.trust?.phoneVerified,
      address_verified: body.trust?.addressVerified,
      response_time_tracked: body.trust?.responseTimeTracked,
      cancellation_notice: body.policies?.cancellationNotice,
      late_arrival_grace_minutes: body.policies?.lateArrivalGraceMinutes,
      no_show_rule: body.policies?.noShowRule,
      hygiene_note: body.policies?.hygieneNote,
      deposit_required: body.policies?.depositRequired,
      children_accepted: body.policies?.childrenAccepted,
      policy_clarity: body.policies?.policyClarity,
    });

    await recordActivity({
      type: "business_settings_edited",
      businessId: body.businessId,
      summary:
        body.status && body.status !== currentBusiness.status
          ? `Business submitted with status ${body.status}.`
          : "Business settings were updated.",
    });

    return NextResponse.json({
      ok: true,
      message: "Business updated",
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
