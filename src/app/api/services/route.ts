import { NextResponse } from "next/server";
import {
  findServicesByBusiness,
  createService,
  updateService,
  toggleService,
  deleteService,
} from "@/lib/service-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import type { Audience } from "@/lib/types";

export const runtime = "nodejs";

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

    const services = await findServicesByBusiness(businessId);

    return NextResponse.json({
      ok: true,
      data: services,
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
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      genderTarget?: Audience;
    };

    if (!body.businessId) {
      return NextResponse.json(
        { ok: false, message: "Business ID is required" },
        { status: 400 },
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Service title is required" },
        { status: 400 },
      );
    }

    if (!body.price || body.price < 0) {
      return NextResponse.json(
        { ok: false, message: "Valid price is required" },
        { status: 400 },
      );
    }

    if (!body.durationMinutes || body.durationMinutes < 5) {
      return NextResponse.json(
        { ok: false, message: "Duration must be at least 5 minutes" },
        { status: 400 },
      );
    }

    const service = await createService({
      businessId: body.businessId,
      title: body.title,
      description: body.description ?? "",
      price: body.price,
      durationMinutes: body.durationMinutes,
      genderTarget: body.genderTarget ?? "unisex",
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Service created",
        data: service,
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
    const body = (await request.json()) as {
      serviceId?: string;
      businessId?: string;
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      genderTarget?: Audience;
      active?: boolean;
      featured?: boolean;
      actionType?: "toggle";
    };

    if (!body.serviceId) {
      return NextResponse.json(
        { ok: false, message: "Service ID is required" },
        { status: 400 },
      );
    }

    let service;

    if (body.actionType === "toggle" && body.businessId) {
      service = await toggleService(body.businessId, body.serviceId);
    } else {
      service = await updateService(body.serviceId, {
        title: body.title,
        description: body.description,
        price: body.price,
        durationMinutes: body.durationMinutes,
        genderTarget: body.genderTarget,
        active: body.active,
        featured: body.featured,
      });
    }

    if (!service) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Service updated",
      data: service,
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
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json(
        { ok: false, message: "Service ID is required" },
        { status: 400 },
      );
    }

    await deleteService(serviceId);

    return NextResponse.json({
      ok: true,
      message: "Service deleted",
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
