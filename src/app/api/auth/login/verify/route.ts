import { NextResponse } from "next/server";

import {
  errorResponse,
  rateLimitResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { verifyAuthChallenge } from "@/lib/auth-challenges";
import { findSessionUserById } from "@/lib/auth-repository";
import {
  applySessionCookie,
  buildRedirectPath,
  createSession,
} from "@/lib/auth-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertAllowedOrigin, getClientIp } from "@/lib/security";
import {
  loginVerifyRequestSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const rateLimit = await consumeRateLimit({
      key: `auth-login-verify:${getClientIp(request)}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(
        "Too many verification attempts. Please request a new code.",
        rateLimit.resetAt,
      );
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(loginVerifyRequestSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await verifyAuthChallenge({
      challengeId: parsed.data.challengeId,
      purpose: "login",
      code: parsed.data.code,
    });

    if (!result.ok) {
      return errorResponse(result.message, 401, "unauthorized");
    }

    const user = await findSessionUserById(result.userId);

    if (!user) {
      return errorResponse("This account could not be loaded anymore.", 404, "not_found");
    }

    const { token, session } = await createSession(user, request);
    const response = NextResponse.json(
      {
        ok: true,
        message: "Login successful.",
        data: {
          session,
          redirectTo: buildRedirectPath(user.role),
        },
      },
      { status: 200 },
    );

    applySessionCookie(response, token, session.expiresAt);
    return response;
  } catch (error) {
    return handleRouteError(error, "Unable to verify the login code.");
  }
}
