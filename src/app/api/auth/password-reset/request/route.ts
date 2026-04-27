import { NextResponse } from "next/server";

import { createAuthChallenge } from "@/lib/auth-challenges";
import {
  findUserByIdentifier,
  resolveUserDeliveryDestination,
} from "@/lib/auth-repository";
import { looksLikeEmailIdentifier } from "@/lib/contact-utils";
import { getRouteErrorMessage } from "@/lib/error-utils";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
  type VerificationDeliveryChannel,
} from "@/lib/verification-delivery";
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
      key: `auth-password-reset:${getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 6,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many reset requests. Please try again in a few minutes.",
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
      deliveryChannel?: VerificationDeliveryChannel;
    };

    if (!body.identifier?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email or phone number is required.",
        },
        { status: 400 },
      );
    }

    const user = await findUserByIdentifier(body.identifier);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "No account matches this email or phone number.",
        },
        { status: 404 },
      );
    }

    const deliveryChannel = resolveDeliveryChannel(
      body.deliveryChannel,
      body.identifier,
    );
    const destination = resolveUserDeliveryDestination(user, deliveryChannel);

    if (!destination) {
      return NextResponse.json(
        {
          ok: false,
          message:
            deliveryChannel === "email"
              ? "This account does not have an email address for password reset."
              : "This account does not have a phone number for password reset.",
        },
        { status: 400 },
      );
    }

    const challenge = await createAuthChallenge({
      userId: user.id,
      purpose: "password_reset",
      deliveryChannel,
      destination,
    });
    const delivery = await deliverVerificationCode({
      deliveryChannel,
      destination,
      code: challenge.code,
      purpose: "password_reset",
    });

    return NextResponse.json(
      {
        ok: true,
        message: formatVerificationDeliveryMessage({
          purpose: "password_reset",
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
      { status: 200 },
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
