import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type {
  AuthDeliveryChannel,
  AuthSessionUser,
  LoginInput,
  RegistrationInput,
  UserRole,
} from "@/lib/auth-types";
import {
  looksLikeEmailIdentifier,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact-utils";
import { fromDatabaseDateTime } from "@/lib/datetime";
import type { BusinessStatus } from "@/lib/types";
import { getDbPool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { categories, cities } from "@/lib/taxonomy";
import { toSlug } from "@/lib/utils";
import { validateEmail, validatePassword, validatePhone } from "@/lib/validation";

type UserRow = RowDataPacket & {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  businessProfileId: string | null;
  businessName: string | null;
  businessStatus: BusinessStatus | null;
  categorySlug: string | null;
  citySlug: string | null;
  area: string | null;
  createdAt: string;
};

const baseUserQuery = `
  SELECT
    u.id,
    u.role,
    u.name,
    u.email,
    u.phone,
    u.password_hash AS passwordHash,
    bp.id AS businessProfileId,
    bp.business_name AS businessName,
    bp.status AS businessStatus,
    bp.category_slug AS categorySlug,
    bp.city_slug AS citySlug,
    bp.area AS area,
    u.created_at AS createdAt
  FROM app_users u
  LEFT JOIN business_profiles bp ON bp.owner_user_id = u.id
`;

function mapRowToSessionUser(row: UserRow): AuthSessionUser {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    phone: row.phone,
    businessProfileId: row.businessProfileId,
    businessName: row.businessName,
    businessStatus: row.businessStatus,
    categorySlug: row.categorySlug as AuthSessionUser["categorySlug"],
    citySlug: row.citySlug,
    area: row.area,
    createdAt: fromDatabaseDateTime(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export async function findUserByEmail(email: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${baseUserQuery} WHERE u.email = ? LIMIT 1`,
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

export async function findUserByPhone(phone: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${baseUserQuery} WHERE u.phone_normalized = ? LIMIT 1`,
    [normalizePhone(phone)],
  );
  return rows[0] ?? null;
}

export async function findUserByIdentifier(identifier: string) {
  return looksLikeEmailIdentifier(identifier)
    ? findUserByEmail(identifier)
    : findUserByPhone(identifier);
}

export async function findSessionUserById(userId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    `${baseUserQuery} WHERE u.id = ? LIMIT 1`,
    [userId],
  );
  const user = rows[0] ?? null;
  return user ? mapRowToSessionUser(user) : null;
}

export function resolveUserDeliveryDestination(
  user: Pick<AuthSessionUser, "email" | "phone">,
  deliveryChannel: AuthDeliveryChannel,
) {
  if (deliveryChannel === "email") {
    return user.email?.trim() || "";
  }

  return user.phone?.trim() || "";
}

function validateCommonRegistration(input: RegistrationInput) {
  if (!input.name.trim()) {
    return "Name is required.";
  }

  if (!input.email.trim()) {
    return "Email is required.";
  }

  if (!validateEmail(input.email)) {
    return "Enter a valid email address.";
  }

  if (!input.phone.trim()) {
    return "Phone is required.";
  }

  if (!validatePhone(input.phone)) {
    return "Enter a valid phone number.";
  }

  const passwordValidation = validatePassword(input.password);

  if (!passwordValidation.valid) {
    return passwordValidation.errors[0]?.message ?? "Password does not meet security requirements.";
  }

  return null;
}

function validateShopRegistration(input: Extract<RegistrationInput, { role: "shop" }>) {
  if (!input.businessName.trim()) {
    return "Business name is required for shop accounts.";
  }

  if (!categories.some((category) => category.slug === input.categorySlug)) {
    return "Choose a valid beauty category.";
  }

  if (!cities.some((city) => city.slug === input.citySlug)) {
    return "Choose a valid city.";
  }

  if (!input.area.trim()) {
    return "Area is required for shop accounts.";
  }

  return null;
}

export async function registerUser(input: RegistrationInput) {
  const commonError = validateCommonRegistration(input);

  if (commonError) {
    return {
      ok: false as const,
      status: 400,
      message: commonError,
    };
  }

  if (input.role === "shop") {
    const shopError = validateShopRegistration(input);

    if (shopError) {
      return {
        ok: false as const,
        status: 400,
        message: shopError,
      };
    }
  }

  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    return {
      ok: false as const,
      status: 409,
      message: "An account with this email already exists.",
    };
  }

  const existingPhoneUser = await findUserByPhone(input.phone);

  if (existingPhoneUser) {
    return {
      ok: false as const,
      status: 409,
      message: "An account with this phone number already exists.",
    };
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = randomUUID();
    const passwordHash = hashPassword(input.password);

    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO app_users (id, role, name, email, phone, phone_normalized, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        input.role,
        input.name.trim(),
        normalizeEmail(input.email),
        input.phone.trim(),
        normalizePhone(input.phone),
        passwordHash,
      ],
    );

    if (input.role === "shop") {
      const slugBase = toSlug(input.businessName.trim()) || "business";

      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO business_profiles (
            id,
            owner_user_id,
            business_name,
            category_slug,
            city_slug,
            area,
            address,
            phone,
            whatsapp,
            slug,
            no_show_rule,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          userId,
          input.businessName.trim(),
          input.categorySlug,
          input.citySlug,
          input.area.trim(),
          `${input.area.trim()}, ${
            cities.find((city) => city.slug === input.citySlug)?.name ?? "Tunisia"
          }`,
          input.phone.trim(),
          input.phone.trim(),
          `${slugBase}-${userId.slice(-6).toLowerCase()}`,
          "Les absences non annoncees peuvent limiter les prochaines demandes.",
          "draft",
        ],
      );
    }

    await connection.commit();

    const user = await findUserByEmail(input.email);

    if (!user) {
      return {
        ok: false as const,
        status: 500,
        message: "Account created, but the session could not be prepared.",
      };
    }

    return {
      ok: true as const,
      status: 201,
      user: mapRowToSessionUser(user),
      message:
        input.role === "shop"
          ? "Shop account created. Complete your dashboard setup next."
          : "Customer account created successfully.",
    };
  } finally {
    connection.release();
  }
}

export async function loginUser(input: LoginInput) {
  if (!input.identifier.trim() || !input.password.trim()) {
    return {
      ok: false as const,
      status: 400,
      message: "Email or phone number and password are required.",
    };
  }

  const user = await findUserByIdentifier(input.identifier);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return {
      ok: false as const,
      status: 401,
      message: "Invalid email or phone number, or password.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    user: mapRowToSessionUser(user),
    message: "Login successful.",
  };
}

export async function updateUserPassword(userId: string, password: string) {
  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      UPDATE app_users
      SET password_hash = ?, password_updated_at = UTC_TIMESTAMP()
      WHERE id = ?
      LIMIT 1
    `,
    [hashPassword(password), userId],
  );
}
