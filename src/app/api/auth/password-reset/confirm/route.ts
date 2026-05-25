import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { verifyAuthChallenge } from "@/lib/auth-challenges";
import { updateUserPassword } from "@/lib/auth-repository";
import { revokeSessionsForUser } from "@/lib/auth-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  passwordResetConfirmRequestSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const rateLimit = await consumeRateLimit({
      key: `auth-password-reset-confirm:${getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(
        "Too many verification attempts. Please request a new reset code.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(passwordResetConfirmRequestSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await verifyAuthChallenge({
      challengeId: parsed.data.challengeId,
      purpose: "password_reset",
      code: parsed.data.code,
    });

    if (!result.ok) {
      return errorResponse(result.message, 401, "unauthorized");
    }

    await updateUserPassword(result.userId, parsed.data.password);
    await revokeSessionsForUser(result.userId);

    return successResponse(
      {
        session: null,
        redirectTo: "/login",
      },
      "Password reset successful. Please sign in with your new password.",
    );
  } catch (error) {
    return handleRouteError(error, "Unable to complete the password reset.");
  }
}
