import "server-only";

import mysql, { type Pool } from "mysql2/promise";

import { env } from "@/lib/env";

declare global {
  var reserveeDbPool: Pool | undefined;
}

function getDatabaseConfig() {
  if (env.DATABASE_URL) {
    const databaseUrl = new URL(env.DATABASE_URL);

    return {
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || "3306"),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: databaseUrl.pathname.replace(/^\/+/, ""),
    };
  }

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
}

export const databaseConfig = getDatabaseConfig();

export function getDbPool() {
  if (!globalThis.reserveeDbPool) {
    globalThis.reserveeDbPool = mysql.createPool({
      ...databaseConfig,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      decimalNumbers: true,
      dateStrings: true,
      timezone: "Z",
    });
  }

  return globalThis.reserveeDbPool;
}

export async function checkDatabaseConnection() {
  const pool = getDbPool();
  await pool.query("SELECT 1");
}

export function getDatabaseErrorMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "ECONNREFUSED":
      return "MySQL is not reachable. Start your database server and check DATABASE_URL or the DB_* variables.";
    case "ER_BAD_DB_ERROR":
      return "The configured database does not exist yet. Run `npm run db:migrate` first.";
    case "ER_ACCESS_DENIED_ERROR":
      return "MySQL credentials were rejected. Check DATABASE_URL or the DB_* variables.";
    case "ER_DUP_ENTRY":
      return "This record already exists.";
    default:
      return "The MySQL backend is not ready yet. Verify the database is running and the migrations have been applied.";
  }
}
