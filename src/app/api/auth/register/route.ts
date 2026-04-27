import { NextResponse } from "next/server";

import { applySessionCookie, buildRedirectPath, createSession } from "@/lib/auth-session";
import { registerUser } from "@/lib/auth-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  assertAllowedOrigin,
  getClientIp,
  HttpRequestError,
} from "@/lib/security";
import type { CategorySlug } from "@/lib/types";

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
      return NextResponse.json(
        {
          ok: false,
          message: "Too many registration attempts. Please try again in a few minutes.",
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
      role?: "customer" | "shop";
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      businessName?: string;
      categorySlug?: CategorySlug;
      citySlug?: string;
      area?: string;
    };

    const result = await registerUser(
      body.role === "shop"
        ? {
            role: "shop",
            name: body.name ?? "",
            email: body.email ?? "",
            phone: body.phone ?? "",
            password: body.password ?? "",
            businessName: body.businessName ?? "",
            categorySlug: body.categorySlug ?? "barbers",
            citySlug: body.citySlug ?? "tunis",
            area: body.area ?? "",
          }
        : {
            role: "customer",
            name: body.name ?? "",
            email: body.email ?? "",
            phone: body.phone ?? "",
            password: body.password ?? "",
          },
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
        },
        { status: result.status },
      );
    }

    const { token, session } = await createSession(result.user, request);
    const response = NextResponse.json(
      {
        ok: true,
        message: result.message,
        session,
        redirectTo: buildRedirectPath(result.user.role),
      },
      { status: result.status },
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
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
