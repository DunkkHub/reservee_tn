import { NextResponse } from "next/server";

import { createSession, applySessionCookie, buildRedirectPath } from "@/lib/auth-session";
import { loginUser } from "@/lib/auth-repository";
import { getDatabaseErrorMessage } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const result = await loginUser({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
        },
        { status: result.status },
      );
    }

    const session = createSession(result.user);
    const response = NextResponse.json(
      {
        ok: true,
        message: result.message,
        session,
        redirectTo: buildRedirectPath(result.user.role),
      },
      { status: result.status },
    );

    applySessionCookie(response, session);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
