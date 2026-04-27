import { NextResponse } from "next/server";

import { verifyBookingReferenceChallenge } from "@/lib/booking-reference-access";
import { getDatabaseErrorMessage } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
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
      key: `public-booking-reference-verify:${getClientIp(request)}:${referenceCode.toUpperCase()}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many verification attempts. Please request a new code later.",
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
      challengeId?: string;
      code?: string;
    };

    if (!body.challengeId?.trim() || !body.code?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Challenge ID and verification code are required." },
        { status: 400 },
      );
    }

    const result = await verifyBookingReferenceChallenge({
      challengeId: body.challengeId,
      referenceCode,
      code: body.code,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Booking verification completed.",
      data: {
        token: result.token,
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
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
