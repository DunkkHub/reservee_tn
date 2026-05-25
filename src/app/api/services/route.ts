import { NextResponse } from "next/server";
import {
  findServicesByBusiness,
  findServiceById,
  createService,
  updateService,
  toggleService,
  duplicateService,
  reorderService,
  deleteService,
} from "@/lib/service-repository";
import { recordActivity } from "@/lib/activity-log-repository";
import { findBusinessById } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { getApiSession } from "@/lib/auth-session";
import { assertAllowedOrigin, HttpRequestError } from "@/lib/security";
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
    assertAllowedOrigin(request);

    const body = (await request.json()) as {
      businessId?: string;
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      genderTarget?: Audience;
    };

    // Auth check: Creating services requires authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (session.user.role !== "shop" && session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only shop owners and admins can manage services" },
        { status: 403 },
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
          { ok: false, message: "You don't have permission to create services for this business" },
          { status: 403 },
        );
      }
    }
    // Admins can create services for any business

    if (!body.title?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Service title is required" },
        { status: 400 },
      );
    }

    if (
      body.price === undefined ||
      body.price === null ||
      Number.isNaN(Number(body.price)) ||
      body.price < 0
    ) {
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

    await recordActivity({
      type: "business_settings_edited",
      businessId: body.businessId,
      summary: `Service ${body.title.trim()} was added.`,
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

export async function PATCH(request: Request) {
  try {
    assertAllowedOrigin(request);

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
      actionType?: "toggle" | "duplicate" | "move";
      direction?: "up" | "down";
    };

    // Auth check: Updating services requires authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (session.user.role !== "shop" && session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only shop owners and admins can manage services" },
        { status: 403 },
      );
    }

    if (!body.serviceId) {
      return NextResponse.json(
        { ok: false, message: "Service ID is required" },
        { status: 400 },
      );
    }

    // Get the service to verify ownership
    const existingService = await findServiceById(body.serviceId);
    if (!existingService) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 },
      );
    }

    // Ownership check: Verify user owns the business
    if (session.user.role === "shop") {
      const business = await findBusinessById(existingService.businessId);
      if (!business || business.ownerId !== session.user.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to update this service" },
          { status: 403 },
        );
      }
    }
    // Admins can update any service

    let service;

    if (body.actionType === "toggle" && body.businessId) {
      service = await toggleService(body.businessId, body.serviceId);
    } else if (body.actionType === "duplicate") {
      service = await duplicateService(existingService.businessId, body.serviceId);
    } else if (body.actionType === "move") {
      const reorderedServices = await reorderService(
        existingService.businessId,
        body.serviceId,
        body.direction ?? "up",
      );
      service =
        reorderedServices.find((item) => item.id === body.serviceId) ?? existingService;
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

    await recordActivity({
      type: "business_settings_edited",
      businessId: existingService.businessId,
      summary:
        body.actionType === "duplicate"
          ? "A service was duplicated."
          : body.actionType === "move"
            ? "Service ordering changed."
            : body.actionType === "toggle"
              ? "A service activation state changed."
              : "Business services were updated.",
    });

    return NextResponse.json({
      ok: true,
      message: "Service updated",
      data: service,
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

export async function DELETE(request: Request) {
  try {
    assertAllowedOrigin(request);

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    // Auth check: Deleting services requires authentication
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (session.user.role !== "shop" && session.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Only shop owners and admins can manage services" },
        { status: 403 },
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { ok: false, message: "Service ID is required" },
        { status: 400 },
      );
    }

    // Get the service to verify ownership
    const service = await findServiceById(serviceId);
    if (!service) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 },
      );
    }

    // Ownership check: Verify user owns the business
    if (session.user.role === "shop") {
      const business = await findBusinessById(service.businessId);
      if (!business || business.ownerId !== session.user.id) {
        return NextResponse.json(
          { ok: false, message: "You don't have permission to delete this service" },
          { status: 403 },
        );
      }
    }
    // Admins can delete any service

    await deleteService(serviceId);

    await recordActivity({
      type: "business_settings_edited",
      businessId: service.businessId,
      summary: "A service was deleted.",
    });

    return NextResponse.json({
      ok: true,
      message: "Service deleted",
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
