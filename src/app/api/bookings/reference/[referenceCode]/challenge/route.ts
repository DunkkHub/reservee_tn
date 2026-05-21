import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import {
  createBookingReferenceChallenge,
  normalizePhone,
} from "@/lib/booking-reference-access";
import { findBookingByReference } from "@/lib/booking-repository";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  bookingReferenceChallengeSchema,
  safeParseWithSchema,
} from "@/lib/validation";
import {
  deliverVerificationCode,
  formatVerificationDeliveryMessage,
} from "@/lib/verification-delivery";

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
      return rateLimitResponse(
        "Too many verification requests. Please try again later.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(bookingReferenceChallengeSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const booking = await findBookingByReference(referenceCode);

    if (
      !booking ||
      normalizePhone(booking.customerPhone) !== normalizePhone(parsed.data.customerPhone)
    ) {
      return errorResponse(
        "Booking reference and phone number do not match.",
        404,
        "not_found",
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

    return successResponse(
      {
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        deliveryChannel: "sms",
        destinationHint: delivery.destinationHint,
        developmentCodePreview: delivery.developmentCodePreview,
      },
      formatVerificationDeliveryMessage({
        purpose: "booking_access",
        result: delivery,
      }),
    );
  } catch (error) {
    return handleRouteError(error, "Unable to start booking verification.");
  }
}
