import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { verifyBookingReferenceChallenge } from "@/lib/booking-reference-access";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  bookingReferenceVerifySchema,
  safeParseWithSchema,
} from "@/lib/validation";

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
      return rateLimitResponse(
        "Too many verification attempts. Please request a new code later.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(bookingReferenceVerifySchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await verifyBookingReferenceChallenge({
      challengeId: parsed.data.challengeId,
      referenceCode,
      code: parsed.data.code,
    });

    if (!result.ok) {
      return errorResponse(result.message, 401, "unauthorized");
    }

    return successResponse(
      {
        token: result.token,
      },
      "Booking verification completed.",
    );
  } catch (error) {
    return handleRouteError(error, "Unable to verify booking access.");
  }
}
