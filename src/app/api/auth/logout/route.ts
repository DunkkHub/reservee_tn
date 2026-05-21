import { cookies } from "next/headers";

import { successResponse } from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import {
  AUTH_COOKIE_NAME,
  clearSessionCookie,
  revokeSessionByToken,
} from "@/lib/auth-session";
import { verifySignedSessionToken } from "@/lib/auth-session-token";
import { env } from "@/lib/env";
import { assertAllowedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const cookieStore = await cookies();
    const signedToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const verifiedToken = signedToken
      ? verifySignedSessionToken(signedToken, env.AUTH_SECRET)
      : null;

    if (verifiedToken?.ok) {
      await revokeSessionByToken(verifiedToken.token);
    }

    const response = successResponse({ loggedOut: true }, "Logged out successfully.");
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleRouteError(error, "Unable to log out right now.");
  }
}
