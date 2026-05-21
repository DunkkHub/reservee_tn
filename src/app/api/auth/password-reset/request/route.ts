import { createAuthChallenge } from "@/lib/auth-challenges";
import {
  rateLimitResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import {
  findUserByIdentifier,
  resolveUserDeliveryDestination,
} from "@/lib/auth-repository";
import { looksLikeEmailIdentifier } from "@/lib/contact-utils";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  passwordResetRequestSchema,
  safeParseWithSchema,
} from "@/lib/validation";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
  type VerificationDeliveryChannel,
} from "@/lib/verification-delivery";

export const runtime = "nodejs";

const PASSWORD_RESET_RESPONSE_MESSAGE =
  "If an account matches those details, a reset code has been sent.";

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
      return rateLimitResponse(
        "Too many reset requests. Please try again in a few minutes.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(passwordResetRequestSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const deliveryChannel = resolveDeliveryChannel(
      parsed.data.deliveryChannel,
      parsed.data.identifier,
    );
    const user = await findUserByIdentifier(parsed.data.identifier);

    if (!user) {
      return successResponse(
        { challenge: null },
        PASSWORD_RESET_RESPONSE_MESSAGE,
      );
    }

    const destination = resolveUserDeliveryDestination(user, deliveryChannel);

    if (!destination) {
      return successResponse(
        { challenge: null },
        PASSWORD_RESET_RESPONSE_MESSAGE,
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
        purpose: "password_reset",
        result: delivery,
      }),
    );
  } catch (error) {
    return handleRouteError(error, "Unable to start the password reset flow.");
  }
}
