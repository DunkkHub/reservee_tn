import "server-only";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type {
  AuthDeliveryChannel,
  AuthSessionUser,
  UserRole,
} from "@/lib/auth-types";
import {
  looksLikeEmailIdentifier,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact-utils";
import { getDbPool } from "@/lib/db";
import { fromDatabaseDateTime } from "@/lib/datetime";
import type { BusinessStatus, CategorySlug } from "@/lib/types";
import { categories, cities } from "@/lib/taxonomy";
import { toSlug } from "@/lib/utils";
import { validatePhone } from "@/lib/validation";

type UserRow = RowDataPacket & {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
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

export function resolveReserveeRole(value: unknown): UserRole {
  if (value === "customer" || value === "shop") {
    return value;
  }

  if (value === "business") {
    return "shop";
  }

  return "customer";
}

export function buildBusinessRegistrationError(input: {
  businessName: string;
  categorySlug: string;
  citySlug: string;
  area: string;
}) {
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

export async function createBusinessProfileForAuthUser(input: {
  userId: string;
  businessName: string;
  categorySlug: CategorySlug;
  citySlug: string;
  area: string;
  phone: string;
}) {
  if (!validatePhone(input.phone)) {
    throw new Error("Enter a valid phone number.");
  }

  const businessError = buildBusinessRegistrationError(input);

  if (businessError) {
    throw new Error(businessError);
  }

  const pool = getDbPool();
  const [existingRows] = await pool.query<(RowDataPacket & { id: string })[]>(
    "SELECT id FROM business_profiles WHERE owner_user_id = ? LIMIT 1",
    [input.userId],
  );

  if (existingRows[0]) {
    return existingRows[0].id;
  }

  const businessId = randomUUID();
  const slugBase = toSlug(input.businessName.trim()) || "business";
  const cityName =
    cities.find((city) => city.slug === input.citySlug)?.name ?? "Tunisia";

  await pool.execute<ResultSetHeader>(
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
      businessId,
      input.userId,
      input.businessName.trim(),
      input.categorySlug,
      input.citySlug,
      input.area.trim(),
      `${input.area.trim()}, ${cityName}`,
      input.phone.trim(),
      input.phone.trim(),
      `${slugBase}-${input.userId.slice(-6).toLowerCase()}`,
      "Les absences non annoncees peuvent limiter les prochaines demandes.",
      "draft",
    ],
  );

  return businessId;
}

export async function deleteAuthUserById(userId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>("DELETE FROM app_users WHERE id = ? LIMIT 1", [
    userId,
  ]);
}

export async function updateUserPassword(userId: string, password: string) {
  const pool = getDbPool();
  const passwordHash = await hashPassword(password);
  const [rows] = await pool.query<(RowDataPacket & { id: string })[]>(
    `
      SELECT id
      FROM \`account\`
      WHERE userId = ?
        AND providerId = 'credential'
      LIMIT 1
    `,
    [userId],
  );
  const accountId = rows[0]?.id;

  if (accountId) {
    await pool.execute<ResultSetHeader>(
      `
        UPDATE \`account\`
        SET password = ?, updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ?
        LIMIT 1
      `,
      [passwordHash, accountId],
    );
  } else {
    await pool.execute<ResultSetHeader>(
      `
        INSERT INTO \`account\` (
          id,
          accountId,
          providerId,
          userId,
          password,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, 'credential', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `,
      [randomUUID(), userId, userId, passwordHash],
    );
  }

  await pool.execute<ResultSetHeader>(
    `
      UPDATE app_users
      SET password_updated_at = UTC_TIMESTAMP()
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
  );
}
