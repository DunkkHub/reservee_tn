import { NextResponse } from "next/server";

import { findBookingByReference } from "@/lib/booking-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    referenceCode: string;
  }>;
};

function maskName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 2) {
    return `${trimmed[0] ?? "*"}*`;
  }

  return `${trimmed[0]}${"*".repeat(Math.max(trimmed.length - 2, 1))}${trimmed.at(-1)}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 4) {
    return null;
  }

  return `${digits.slice(0, 3)}${"*".repeat(Math.max(digits.length - 5, 1))}${digits.slice(-2)}`;
}

function toPublicBookingLookup(booking: Booking) {
  return {
    id: booking.id,
    referenceCode: booking.referenceCode,
    businessId: booking.businessId,
    serviceId: booking.serviceId,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    source: booking.source,
    expiresAt: booking.expiresAt ?? null,
    rescheduleRequestedAt: booking.rescheduleRequestedAt ?? null,
    statusUpdatedAt: booking.statusUpdatedAt ?? null,
    createdAt: booking.createdAt,
    customerName: null,
    customerPhone: null,
    customerNameMasked: maskName(booking.customerName),
    customerPhoneMasked: maskPhone(booking.customerPhone),
  };
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { referenceCode } = await context.params;
    const rateLimit = consumeRateLimit({
      key: `public-booking-reference:${getClientIp(request)}`,
      windowMs: 5 * 60 * 1000,
      maxRequests: 20,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many booking lookups. Please try again in a few minutes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (!booking) {
      return NextResponse.json(
        { ok: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: toPublicBookingLookup(booking),
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
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
