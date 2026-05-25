import { successResponse, unauthorizedResponse } from "@/lib/api-response";
import { getCurrentSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorizedResponse("Authentication required.");
  }

  return successResponse({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  });
}
