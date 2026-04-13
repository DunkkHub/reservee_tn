import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import {
  createMediaItem,
  deleteMediaItem,
  findMediaByBusiness,
  reorderMediaItem,
  setCoverMediaItem,
} from "@/lib/media-repository";

export const runtime = "nodejs";

async function canManageBusiness(session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>, businessId: string) {
  if (session.user.role === "admin") {
    return true;
  }

  if (session.user.role !== "shop") {
    return false;
  }

  const business = await findBusinessById(businessId);
  return Boolean(business && business.ownerId === session.user.id);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    const media = await findMediaByBusiness(businessId);

    return NextResponse.json({
      ok: true,
      data: media,
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
    const session = await getApiSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      businessId?: string;
      url?: string;
      alt?: string;
      type?: "cover" | "gallery";
    };

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (!(await canManageBusiness(session, body.businessId))) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to manage media for this business" },
        { status: 403 },
      );
    }

    if (!body.url?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Image URL is required" },
        { status: 400 },
      );
    }

    const media = await createMediaItem({
      businessId: body.businessId,
      url: body.url,
      alt: body.alt ?? "",
      type: body.type ?? "gallery",
    });

    await recordActivity({
      type: "business_settings_edited",
      businessId: body.businessId,
      summary: "Business gallery was updated.",
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Media item created",
        data: media,
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

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      businessId?: string;
      mediaId?: string;
      actionType?: "move" | "setCover";
      direction?: "up" | "down";
    };

    if (!body.businessId || !body.mediaId || !body.actionType) {
      return NextResponse.json(
        { ok: false, message: "Business ID, media ID, and action type are required" },
        { status: 400 },
      );
    }

    if (!(await canManageBusiness(session, body.businessId))) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to manage media for this business" },
        { status: 403 },
      );
    }

    const media =
      body.actionType === "setCover"
        ? await setCoverMediaItem(body.businessId, body.mediaId)
        : await reorderMediaItem(body.businessId, body.mediaId, body.direction ?? "up");

    await recordActivity({
      type: "business_settings_edited",
      businessId: body.businessId,
      summary:
        body.actionType === "setCover"
          ? "Business cover image was updated."
          : "Business gallery order changed.",
    });

    return NextResponse.json({
      ok: true,
      message: "Media updated",
      data: media,
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

export async function DELETE(request: Request) {
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
    const mediaId = searchParams.get("mediaId");

    if (!businessId || !mediaId) {
      return NextResponse.json(
        { ok: false, message: "Business ID and media ID are required" },
        { status: 400 },
      );
    }

    if (!(await canManageBusiness(session, businessId))) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to manage media for this business" },
        { status: 403 },
      );
    }

    await deleteMediaItem(businessId, mediaId);

    await recordActivity({
      type: "business_settings_edited",
      businessId,
      summary: "A gallery image was removed.",
    });

    return NextResponse.json({
      ok: true,
      message: "Media deleted",
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
