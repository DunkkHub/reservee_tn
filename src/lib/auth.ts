import "server-only";

import { randomUUID } from "node:crypto";

import { createAuthMiddleware, APIError } from "better-auth/api";
import { betterAuth } from "better-auth";

import {
  buildBusinessRegistrationError,
  createBusinessProfileForAuthUser,
  deleteAuthUserById,
  findUserByPhone,
  resolveReserveeRole,
} from "@/lib/auth-repository";
import { normalizePhone } from "@/lib/contact-utils";
import { getDbPool } from "@/lib/db";
import { env } from "@/lib/env";
import type { CategorySlug } from "@/lib/types";
import { validatePassword, validatePhone } from "@/lib/validation";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function getStringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function badRequest(message: string) {
  return APIError.from("BAD_REQUEST", {
    message,
    code: "RESERVEE_AUTH_VALIDATION_ERROR",
  });
}

async function prepareReserveeSignUp(ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]) {
  if (ctx.path !== "/sign-up/email") {
    return;
  }

  const body = asRecord(ctx.body);
  const requestedRole = body.role;

  if (
    requestedRole !== undefined &&
    requestedRole !== "customer" &&
    requestedRole !== "shop" &&
    requestedRole !== "business"
  ) {
    throw badRequest("Public registration supports customer and business accounts only.");
  }

  const role = resolveReserveeRole(requestedRole);
  const phone = getStringField(body, "phone");
  const password = getStringField(body, "password");

  if (!validatePhone(phone)) {
    throw badRequest("Enter a valid phone number.");
  }

  const passwordValidation = validatePassword(password);

  if (!passwordValidation.valid) {
    throw badRequest(
      passwordValidation.errors[0]?.message ??
        "Password does not meet security requirements.",
    );
  }

  const existingPhoneUser = await findUserByPhone(phone);

  if (existingPhoneUser) {
    throw APIError.from("BAD_REQUEST", {
      message: "An account with this phone number already exists.",
      code: "PHONE_ALREADY_EXISTS",
    });
  }

  if (role === "shop") {
    const businessError = buildBusinessRegistrationError({
      businessName: getStringField(body, "businessName"),
      categorySlug: getStringField(body, "categorySlug"),
      citySlug: getStringField(body, "citySlug"),
      area: getStringField(body, "area"),
    });

    if (businessError) {
      throw badRequest(businessError);
    }
  }

  ctx.body.role = role;
  ctx.body.phone = phone;
  ctx.body.phoneNormalized = normalizePhone(phone);
}

async function finishReserveeSignUp(ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]) {
  if (ctx.path !== "/sign-up/email") {
    return;
  }

  const role = ctx.context.newSession?.user.role;

  if (role !== "shop") {
    return;
  }

  const body = asRecord(ctx.body);
  const userId = ctx.context.newSession?.user.id;

  if (!userId) {
    throw badRequest("The created user could not be linked to a business profile.");
  }

  try {
    await createBusinessProfileForAuthUser({
      userId,
      businessName: getStringField(body, "businessName"),
      categorySlug: getStringField(body, "categorySlug") as CategorySlug,
      citySlug: getStringField(body, "citySlug"),
      area: getStringField(body, "area"),
      phone: getStringField(body, "phone"),
    });
  } catch (error) {
    await deleteAuthUserById(userId);
    throw badRequest(
      error instanceof Error
        ? error.message
        : "The business profile could not be created.",
    );
  }
}

export const auth = betterAuth({
  appName: "Reservee TN",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: Array.from(
    new Set([env.APP_URL, env.BETTER_AUTH_URL].filter(Boolean)),
  ),
  database: getDbPool(),
  user: {
    modelName: "app_users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      role: {
        type: ["customer", "shop", "admin"],
        required: true,
        defaultValue: "customer",
        input: true,
      },
      phone: {
        type: "string",
        required: true,
        input: true,
      },
      phoneNormalized: {
        type: "string",
        required: true,
        returned: false,
        input: true,
        fieldName: "phone_normalized",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  hooks: {
    before: createAuthMiddleware(prepareReserveeSignUp),
    after: createAuthMiddleware(finishReserveeSignUp),
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    database: {
      generateId: () => randomUUID(),
    },
  },
});
