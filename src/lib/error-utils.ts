import { getDatabaseErrorMessage } from "@/lib/db";

export function getRouteErrorMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (code) {
    return getDatabaseErrorMessage(error);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong.";
}
