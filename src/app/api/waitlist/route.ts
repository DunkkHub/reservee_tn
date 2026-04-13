import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity-log-repository";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById, findBusinessByOwner } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { findServiceById } from "@/lib/service-repository";
import {
  createWaitlistRequest,
  findWaitlistRequestsByBusiness,
} from "@/lib/waitlist-repository";

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
        { ok: false, message: "Customers cannot view waitlist requests" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

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
          { ok: false, message: "You don't have permission to view that business waitlist" },
          { status: 403 },
        );
      }

      const waitlist = await findWaitlistRequestsByBusiness(ownedBusiness.id);
      return NextResponse.json({
        ok: true,
        data: waitlist,
      });
    }

    if (!businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required for admin waitlist lookups" },
        { status: 400 },
      );
    }

    const waitlist = await findWaitlistRequestsByBusiness(businessId);
    return NextResponse.json({
      ok: true,
      data: waitlist,
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
      serviceId?: string;
      customerName?: string;
      customerPhone?: string;
      preferredDate?: string;
      preferredTime?: string;
      note?: string;
    };

    if (!body.businessId || !body.serviceId) {
      return NextResponse.json(
        { ok: false, message: "Business ID and service ID are required" },
        { status: 400 },
      );
    }

    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Customer name and phone are required" },
        { status: 400 },
      );
    }

    if (!body.preferredDate || !body.preferredTime?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Preferred date and preferred time are required" },
        { status: 400 },
      );
    }

    const business = await findBusinessById(body.businessId);
    const service = await findServiceById(body.serviceId);

    if (!business || !service || service.businessId !== business.id) {
      return NextResponse.json(
        { ok: false, message: "Business or service not found" },
        { status: 404 },
      );
    }

    const waitlist = await createWaitlistRequest({
      businessId: body.businessId,
      serviceId: body.serviceId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      note: body.note,
    });

    await recordActivity({
      type: "waitlist_request_created",
      businessId: body.businessId,
      summary: `A preferred-time request was created for ${body.preferredTime}.`,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Waitlist request created",
        data: waitlist,
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
