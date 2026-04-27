import { NextResponse } from "next/server";

import { verifyAuthChallenge } from "@/lib/auth-challenges";
import { findSessionUserById, updateUserPassword } from "@/lib/auth-repository";
import {
  applySessionCookie,
  buildRedirectPath,
  createSession,
  revokeSessionsForUser,
} from "@/lib/auth-session";
import { getRouteErrorMessage } from "@/lib/error-utils";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  assertAllowedOrigin,
  getClientIp,
  HttpRequestError,
} from "@/lib/security";

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
      return NextResponse.json(
        {
          ok: false,
          message: "Too many verification attempts. Please request a new reset code.",
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
      password?: string;
    };

    if (!body.challengeId?.trim() || !body.code?.trim() || !body.password?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Challenge ID, verification code, and new password are required.",
        },
        { status: 400 },
      );
    }

    if (body.password.trim().length < 8) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const result = await verifyAuthChallenge({
      challengeId: body.challengeId,
      purpose: "password_reset",
      code: body.code,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
        },
        { status: 401 },
      );
    }

    await updateUserPassword(result.userId, body.password);
    await revokeSessionsForUser(result.userId);

    const user = await findSessionUserById(result.userId);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "The password was updated, but the account could not be loaded.",
        },
        { status: 404 },
      );
    }

    const { token, session } = await createSession(user, request);
    const response = NextResponse.json(
      {
        ok: true,
        message: "Password reset successful.",
        session,
        redirectTo: buildRedirectPath(user.role),
      },
      { status: 200 },
    );

    applySessionCookie(response, token, session.expiresAt);
    return response;
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
