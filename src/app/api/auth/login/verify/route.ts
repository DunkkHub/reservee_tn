import { errorResponse } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  return errorResponse(
    "Login verification codes are no longer used for account sign-in. Use /api/auth/sign-in/email.",
    410,
    "invalid_input",
  );
}
