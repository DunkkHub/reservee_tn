import { NextResponse } from "next/server";
import type { ValidationError } from "@/lib/validation";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  message?: string;
  error?: string;
  data?: T;
  errors?: ValidationError[];
}

export function successResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200,
) {
  return NextResponse.json(
    {
      ok: true,
      message,
      data,
    },
    { status },
  );
}

export function createdResponse<T>(
  data: T,
  message: string = "Resource created successfully",
) {
  return NextResponse.json(
    {
      ok: true,
      message,
      data,
    },
    { status: 201 },
  );
}

export function errorResponse(
  message: string = "An error occurred",
  status: number = 400,
  errors?: ValidationError[],
) {
  return NextResponse.json(
    {
      ok: false,
      message,
      error: message,
      ...(errors && errors.length > 0 ? { errors } : {}),
    },
    { status },
  );
}

export function notFoundResponse(message: string = "Resource not found") {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(message: string = "Unauthorized") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = "Forbidden") {
  return errorResponse(message, 403);
}

export function conflictResponse(message: string = "Conflict") {
  return errorResponse(message, 409);
}

export function validationErrorResponse(errors: ValidationError[]) {
  return errorResponse("Validation failed", 400, errors);
}

export function serverErrorResponse(error: unknown, message?: string) {
  console.error("[API Error]", error);
  return errorResponse(
    message ?? "An internal server error occurred",
    500,
  );
}
