import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type {
  AuthSessionUser,
  LoginInput,
  RegistrationInput,
  UserRole,
} from "@/lib/auth-types";
import { categories, cities } from "@/lib/seed-data";
import type { BusinessStatus } from "@/lib/types";
import { getDbPool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.trim();
}

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
    createdAt: row.createdAt,
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

function validateCommonRegistration(input: RegistrationInput) {
  if (!input.name.trim()) {
    return "Name is required.";
  }

  if (!input.email.trim()) {
    return "Email is required.";
  }

  if (!input.phone.trim()) {
    return "Phone is required.";
  }

  if (input.password.trim().length < 8) {
    return "Password must be at least 8 characters.";
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

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = randomUUID();
    const passwordHash = hashPassword(input.password);

    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO app_users (id, role, name, email, phone, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        input.role,
        input.name.trim(),
        normalizeEmail(input.email),
        normalizePhone(input.phone),
        passwordHash,
      ],
    );

    if (input.role === "shop") {
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
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
  if (!input.email.trim() || !input.password.trim()) {
    return {
      ok: false as const,
      status: 400,
      message: "Email and password are required.",
    };
  }

  const user = await findUserByEmail(input.email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return {
      ok: false as const,
      status: 401,
      message: "Invalid email or password.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    user: mapRowToSessionUser(user),
    message: "Login successful.",
  };
}
