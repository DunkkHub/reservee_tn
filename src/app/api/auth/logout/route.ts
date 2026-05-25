import { headers } from "next/headers";

import { successResponse } from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { auth } from "@/lib/auth";
import { assertAllowedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);
    await auth.api.signOut({ headers: await headers() });
    return successResponse({ loggedOut: true }, "Logged out successfully.");
  } catch (error) {
    return handleRouteError(error, "Unable to log out right now.");
  }
}
