import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashPassword } from "better-auth/crypto";
import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

function parseArgs(argv) {
  const values = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const separatorIndex = arg.indexOf("=");
    const key =
      separatorIndex === -1 ? arg.slice(2) : arg.slice(2, separatorIndex);
    const value = separatorIndex === -1 ? "true" : arg.slice(separatorIndex + 1);
    values[key] = value;
  }

  return values;
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

function requireInput(value, name) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${name} is required.`);
  }

  return trimmed;
}

const args = parseArgs(process.argv.slice(2));
const email = normalizeEmail(requireInput(args.email ?? process.env.ADMIN_EMAIL, "Admin email"));
const password = requireInput(args.password ?? process.env.ADMIN_PASSWORD, "Admin password");
const name = requireInput(args.name ?? process.env.ADMIN_NAME, "Admin name");
const phone = requireInput(args.phone ?? process.env.ADMIN_PHONE, "Admin phone");
const phoneNormalized = normalizePhone(phone);

if (
  password.length < 10 ||
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/[0-9]/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error(
    "Admin password must be at least 10 characters and include uppercase, lowercase, number, and special characters.",
  );
}

if (!phoneNormalized) {
  throw new Error("Admin phone must contain digits.");
}

const connection = await mysql.createConnection({
  ...getDatabaseConfigFromEnv(),
  multipleStatements: true,
});

try {
  await connection.beginTransaction();

  const [existingRows] = await connection.query(
    `
      SELECT id
      FROM app_users
      WHERE email = ?
         OR phone_normalized = ?
      LIMIT 1
    `,
    [email, phoneNormalized],
  );
  const userId = existingRows[0]?.id ?? randomUUID();
  const passwordHash = await hashPassword(password);

  if (existingRows[0]) {
    await connection.execute(
      `
        UPDATE app_users
        SET role = 'admin',
            name = ?,
            email = ?,
            email_verified = TRUE,
            phone = ?,
            phone_normalized = ?,
            password_hash = NULL,
            password_updated_at = UTC_TIMESTAMP(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [name, email, phone, phoneNormalized, userId],
    );
  } else {
    await connection.execute(
      `
        INSERT INTO app_users (
          id,
          role,
          name,
          email,
          email_verified,
          phone,
          phone_normalized,
          password_hash,
          password_updated_at
        )
        VALUES (?, 'admin', ?, ?, TRUE, ?, ?, NULL, UTC_TIMESTAMP())
      `,
      [userId, name, email, phone, phoneNormalized],
    );
  }

  const [accountRows] = await connection.query(
    `
      SELECT id
      FROM \`account\`
      WHERE userId = ?
        AND providerId = 'credential'
      LIMIT 1
    `,
    [userId],
  );

  if (accountRows[0]) {
    await connection.execute(
      `
        UPDATE \`account\`
        SET accountId = ?,
            password = ?,
            updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ?
        LIMIT 1
      `,
      [userId, passwordHash, accountRows[0].id],
    );
  } else {
    await connection.execute(
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

  await connection.commit();
  console.log(`Admin user is ready: ${email}`);
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
