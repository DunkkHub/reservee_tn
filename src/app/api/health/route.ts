import { successResponse } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  return successResponse(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "reservee-tn",
    },
    "Service is healthy.",
    200,
    {
      "Cache-Control": "no-store",
    },
  );
}
