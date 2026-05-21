import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { logError } from "@/lib/logger";
import { toValidationErrors, type ValidationError } from "@/lib/validation";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "csrf_origin_denied"
  | "server_error";

export interface ApiResponse<T = unknown> {
  ok: true | false;
  message?: string;
  data?: T;
  error?: {
    code: ApiErrorCode;
    message: string;
    details?: ValidationError[];
  };
}

export class ApiRouteError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: ValidationError[];

  constructor(input: {
    code: ApiErrorCode;
    status: number;
    message: string;
    details?: ValidationError[];
  }) {
    super(input.message);
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export function successResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: true,
      message,
      data,
    },
    { status, headers },
  );
}

export function createdResponse<T>(
  data: T,
  message: string = "Resource created successfully",
) {
  return successResponse(data, message, 201);
}

export function errorResponse(
  message: string,
  status: number,
  code: ApiErrorCode,
  details?: ValidationError[],
  headers?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: false,
      message,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status, headers },
  );
}

export function notFoundResponse(message: string = "Resource not found") {
  return errorResponse(message, 404, "not_found");
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorResponse(message, 401, "unauthorized");
}

export function forbiddenResponse(message: string = "Forbidden") {
  return errorResponse(message, 403, "forbidden");
}

export function conflictResponse(message: string = "Conflict") {
  return errorResponse(message, 409, "conflict");
}

export function rateLimitResponse(
  message: string,
  resetAt: number,
) {
  return errorResponse(message, 429, "rate_limited", undefined, {
    "Retry-After": String(Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1)),
  });
}

export function validationErrorResponse(
  errors: ValidationError[] | ZodError,
  message: string = "Validation failed",
) {
  return errorResponse(message, 400, "invalid_input", toValidationErrors(errors));
}

export function serverErrorResponse(error: unknown, message?: string) {
  logError("api.request.failed", error);
  return errorResponse(message ?? "An internal server error occurred", 500, "server_error");
}
