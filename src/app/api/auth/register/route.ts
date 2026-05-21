import {
  createdResponse,
  errorResponse,
  rateLimitResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { registerUser } from "@/lib/auth-repository";
import {
  applySessionCookie,
  buildRedirectPath,
  createSession,
} from "@/lib/auth-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  registerRequestSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const rateLimit = await consumeRateLimit({
      key: `auth-register:${getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 6,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(
        "Too many registration attempts. Please try again in a few minutes.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(registerRequestSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await registerUser(parsed.data);

    if (!result.ok) {
      return errorResponse(
        result.message,
        result.status,
        result.status === 409 ? "conflict" : "invalid_input",
      );
    }

    const { token, session } = await createSession(result.user, request);
    const response = createdResponse(
      {
        session,
        redirectTo: buildRedirectPath(result.user.role),
      },
      result.message,
    );

    applySessionCookie(response, token, session.expiresAt);
    return response;
  } catch (error) {
    return handleRouteError(error, "Unable to register this account.");
  }
}
