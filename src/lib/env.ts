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
  BETTER_AUTH_URL: z
    .string({ error: "BETTER_AUTH_URL is required." })
    .url("BETTER_AUTH_URL must be a valid URL."),
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET is required." })
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("reservee_tn"),
  DB_SSL: booleanLike,
  DB_SSL_CA: z.string().optional(),
  VERIFICATION_CODE_DEV_PREVIEW: booleanLike,
  BOOKING_OTP_DEV_PREVIEW: booleanLike,
  NOTIFICATION_EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  NOTIFICATION_SMS_PROVIDER: z.enum(["console", "twilio"]).default("console"),
  MEDIA_STORAGE_PROVIDER: z
    .enum(["local", "external_url", "s3", "r2", "cloudinary"])
    .default("local"),
  MEDIA_LOCAL_UPLOAD_DIR: z.string().default("public/uploads"),
  MEDIA_PUBLIC_BASE_PATH: z.string().default("/uploads"),
  MEDIA_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5_000_000),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_FROM_PHONE: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

const parsedResult = envSchema.safeParse(process.env);

if (!parsedResult.success) {
  const message = parsedResult.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid server environment: ${message}`);
}

const parsed = parsedResult.data;
const appUrl =
  parsed.APP_URL ??
  parsed.NEXT_PUBLIC_APP_URL ??
  parsed.BETTER_AUTH_URL;
const betterAuthUrl = parsed.BETTER_AUTH_URL;
const betterAuthSecret = parsed.BETTER_AUTH_SECRET;

if (parsed.NODE_ENV === "production") {
  if (!appUrl) {
    throw new Error("APP_URL is required in production.");
  }

  const betterAuthUrlValue = new URL(betterAuthUrl);
  const isLocalBetterAuthUrl =
    betterAuthUrlValue.hostname === "localhost" ||
    betterAuthUrlValue.hostname === "127.0.0.1" ||
    betterAuthUrlValue.hostname === "::1";

  if (betterAuthUrlValue.protocol !== "https:" && !isLocalBetterAuthUrl) {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    betterAuthUrl !== "https://reserveetn.app"
  ) {
    throw new Error("BETTER_AUTH_URL must be https://reserveetn.app in Vercel production.");
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
  BETTER_AUTH_URL: betterAuthUrl,
  BETTER_AUTH_SECRET: betterAuthSecret,
};

export function getAllowedOrigin() {
  return new URL(env.APP_URL).origin;
}
