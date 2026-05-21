import { createAuthChallenge } from "@/lib/auth-challenges";
import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { loginUser, resolveUserDeliveryDestination } from "@/lib/auth-repository";
import { looksLikeEmailIdentifier } from "@/lib/contact-utils";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  loginRequestSchema,
  safeParseWithSchema,
} from "@/lib/validation";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
  type VerificationDeliveryChannel,
} from "@/lib/verification-delivery";

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
      return rateLimitResponse(
        "Too many login attempts. Please try again in a few minutes.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(loginRequestSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await loginUser({
      identifier: parsed.data.identifier,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return errorResponse(
        result.message,
        result.status,
        result.status === 400 ? "invalid_input" : "unauthorized",
      );
    }

    const deliveryChannel = resolveDeliveryChannel(
      parsed.data.deliveryChannel,
      parsed.data.identifier,
    );
    const destination = resolveUserDeliveryDestination(result.user, deliveryChannel);

    if (!destination) {
      return errorResponse(
        deliveryChannel === "email"
          ? "This account does not have an email address for verification."
          : "This account does not have a phone number for verification.",
        400,
        "invalid_input",
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

    return successResponse(
      {
        challenge: {
          challengeId: challenge.challengeId,
          expiresAt: challenge.expiresAt,
          deliveryChannel: delivery.deliveryChannel,
          destinationHint: delivery.destinationHint,
          developmentCodePreview: delivery.developmentCodePreview,
        },
      },
      formatVerificationDeliveryMessage({
        purpose: "login",
        result: delivery,
      }),
      result.status,
    );
  } catch (error) {
    return handleRouteError(error, "Unable to start login verification.");
  }
}
