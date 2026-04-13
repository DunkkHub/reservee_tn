import { NextResponse } from "next/server";

import { applySessionCookie, buildRedirectPath, createSession } from "@/lib/auth-session";
import { registerUser } from "@/lib/auth-repository";
import { getDatabaseErrorMessage } from "@/lib/db";
import type { CategorySlug } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
