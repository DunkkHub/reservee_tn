import { NextResponse } from "next/server";

import {
  createBookingReferenceChallenge,
  normalizePhone,
} from "@/lib/booking-reference-access";
import { findBookingByReference } from "@/lib/booking-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    referenceCode: string;
  }>;
};

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { referenceCode } = await context.params;
    const rateLimit = consumeRateLimit({
      key: `public-booking-reference-challenge:${getClientIp(request)}:${referenceCode.toUpperCase()}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many verification requests. Please try again later.",
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
      customerPhone?: string;
    };

    if (!body.customerPhone?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Customer phone is required to request a verification code." },
        { status: 400 },
      );
    }

    const booking = await findBookingByReference(referenceCode);

    if (
      !booking ||
      normalizePhone(booking.customerPhone) !== normalizePhone(body.customerPhone)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Booking reference and phone number do not match.",
        },
        { status: 404 },
      );
    }

    const challenge = createBookingReferenceChallenge({
      referenceCode,
      customerPhone: booking.customerPhone,
    });

    return NextResponse.json({
      ok: true,
      message:
        challenge.code
          ? "Verification code generated. Development preview is included because this environment is not sending SMS."
          : "Verification code sent to the booking phone number.",
      data: {
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        deliveryChannel: "sms",
        developmentCodePreview: challenge.code ?? null,
      },
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
