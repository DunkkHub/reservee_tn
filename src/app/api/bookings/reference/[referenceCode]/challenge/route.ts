import { NextResponse } from "next/server";

import {
  createBookingReferenceChallenge,
  normalizePhone,
} from "@/lib/booking-reference-access";
import { findBookingByReference } from "@/lib/booking-repository";
import { getRouteErrorMessage } from "@/lib/error-utils";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
} from "@/lib/verification-delivery";
import {
  assertAllowedOrigin,
  getClientIp,
  HttpRequestError,
} from "@/lib/security";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    referenceCode: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertAllowedOrigin(request);

    const { referenceCode } = await context.params;
    const rateLimit = await consumeRateLimit({
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

    const challenge = await createBookingReferenceChallenge({
      referenceCode,
      customerPhone: booking.customerPhone,
    });
    const delivery = await deliverVerificationCode({
      deliveryChannel: "sms",
      destination: booking.customerPhone,
      code: challenge.code,
      purpose: "booking_access",
    });

    return NextResponse.json({
      ok: true,
      message: formatVerificationDeliveryMessage({
        purpose: "booking_access",
        result: delivery,
      }),
      data: {
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        deliveryChannel: "sms",
        destinationHint: delivery.destinationHint,
        developmentCodePreview: delivery.developmentCodePreview,
      },
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
        message: getRouteErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
