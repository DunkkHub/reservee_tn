import { ApiRouteError, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { HttpRequestError } from "@/lib/security";

export function handleRouteError(error: unknown, message?: string) {
  if (error instanceof ApiRouteError) {
    return errorResponse(error.message, error.status, error.code, error.details);
  }

  if (error instanceof HttpRequestError) {
    const code =
      error.status === 401
        ? "unauthorized"
        : error.status === 403
          ? "csrf_origin_denied"
          : error.status === 404
            ? "not_found"
            : error.status === 409
              ? "conflict"
              : error.status === 429
                ? "rate_limited"
                : error.status === 400
                  ? "invalid_input"
                  : "server_error";

    return errorResponse(error.message, error.status, code);
  }

  return serverErrorResponse(error, message);
}
