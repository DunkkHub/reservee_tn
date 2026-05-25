import { errorResponse } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  return errorResponse(
    "Email/password login is handled by Better Auth at /api/auth/sign-in/email.",
    410,
    "invalid_input",
  );
}
