import { errorResponse, successResponse } from "@/lib/api-response";
import { checkDatabaseConnection } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await checkDatabaseConnection();

    return successResponse(
      {
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
        },
      },
      "Service is ready.",
      200,
      {
        "Cache-Control": "no-store",
      },
    );
  } catch {
    return errorResponse(
      "Database connectivity check failed.",
      503,
      "server_error",
      undefined,
      {
        "Cache-Control": "no-store",
      },
    );
  }
}
