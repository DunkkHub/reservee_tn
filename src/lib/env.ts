import "server-only";

import { z } from "zod";

const booleanLike = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return false;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("reservee_tn"),
  AUTH_SECRET: z.string().default("dev-auth-secret-change-me"),
  SESSION_COOKIE_NAME: z.string().default("reservee_session"),
  VERIFICATION_CODE_DEV_PREVIEW: booleanLike,
  BOOKING_OTP_DEV_PREVIEW: booleanLike,
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_FROM_PHONE: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

const parsed = envSchema.parse(process.env);
const appUrl = parsed.APP_URL ?? parsed.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (parsed.NODE_ENV === "production") {
  if (!appUrl) {
    throw new Error("APP_URL is required in production.");
  }

  if (
    !parsed.AUTH_SECRET ||
    parsed.AUTH_SECRET === "change-this-secret-for-production" ||
    parsed.AUTH_SECRET === "dev-auth-secret-change-me" ||
    parsed.AUTH_SECRET.length < 32
  ) {
    throw new Error("AUTH_SECRET must be set to a strong production secret.");
  }
}

if (!parsed.DATABASE_URL && (!parsed.DB_HOST || !parsed.DB_USER || !parsed.DB_NAME)) {
  throw new Error(
    "Set DATABASE_URL or the DB_HOST, DB_PORT, DB_USER, and DB_NAME variables.",
  );
}

export const env = {
  ...parsed,
  APP_URL: appUrl,
};

export function getAllowedOrigin() {
  return new URL(env.APP_URL).origin;
}
