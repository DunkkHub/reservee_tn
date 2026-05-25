import { errorResponse } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  return errorResponse(
    "Registration is handled by Better Auth at /api/auth/sign-up/email.",
    410,
    "invalid_input",
  );
}
