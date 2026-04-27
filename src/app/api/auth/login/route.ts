import { NextResponse } from "next/server";

import { createAuthChallenge } from "@/lib/auth-challenges";
import { loginUser, resolveUserDeliveryDestination } from "@/lib/auth-repository";
import { looksLikeEmailIdentifier } from "@/lib/contact-utils";
import { getRouteErrorMessage } from "@/lib/error-utils";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
  type VerificationDeliveryChannel,
} from "@/lib/verification-delivery";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  assertAllowedOrigin,
  getClientIp,
  HttpRequestError,
} from "@/lib/security";

export const runtime = "nodejs";

function resolveDeliveryChannel(
  requested: string | undefined,
  identifier: string,
): VerificationDeliveryChannel {
  if (requested === "email" || requested === "sms") {
    return requested;
  }

  return looksLikeEmailIdentifier(identifier) ? "email" : "sms";
}

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const rateLimit = await consumeRateLimit({
      key: `auth-login:${getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 8,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many login attempts. Please try again in a few minutes.",
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
      identifier?: string;
      password?: string;
      deliveryChannel?: VerificationDeliveryChannel;
    };

    const result = await loginUser({
      identifier: body.identifier ?? "",
      password: body.password ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
        },
        { status: result.status },
      );
    }

    const deliveryChannel = resolveDeliveryChannel(
      body.deliveryChannel,
      body.identifier ?? "",
    );
    const destination = resolveUserDeliveryDestination(result.user, deliveryChannel);

    if (!destination) {
      return NextResponse.json(
        {
          ok: false,
          message:
            deliveryChannel === "email"
              ? "This account does not have an email address for verification."
              : "This account does not have a phone number for verification.",
        },
        { status: 400 },
      );
    }

    const challenge = await createAuthChallenge({
      userId: result.user.id,
      purpose: "login",
      deliveryChannel,
      destination,
    });
    const delivery = await deliverVerificationCode({
      deliveryChannel,
      destination,
      code: challenge.code,
      purpose: "login",
    });

    return NextResponse.json(
      {
        ok: true,
        message: formatVerificationDeliveryMessage({
          purpose: "login",
          result: delivery,
        }),
        challenge: {
          challengeId: challenge.challengeId,
          expiresAt: challenge.expiresAt,
          deliveryChannel: delivery.deliveryChannel,
          destinationHint: delivery.destinationHint,
          developmentCodePreview: delivery.developmentCodePreview,
        },
      },
      { status: result.status },
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
        message: getRouteErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
