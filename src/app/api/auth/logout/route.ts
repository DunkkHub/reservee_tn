import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  clearSessionCookie,
  revokeSessionByToken,
} from "@/lib/auth-session";
import { assertAllowedOrigin, HttpRequestError } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      await revokeSessionByToken(token);
    }

    const response = NextResponse.json({
      ok: true,
      message: "Logged out successfully.",
    });

    clearSessionCookie(response);
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
        message: "Unable to log out right now.",
      },
      { status: 500 },
    );
  }
}
