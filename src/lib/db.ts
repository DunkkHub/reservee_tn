import "server-only";

import fs from "node:fs";

import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

import { env } from "@/lib/env";

declare global {
  var reserveeDbPool: Pool | undefined;
}

function isSslRequested(databaseUrl: URL) {
  const sslValue =
    databaseUrl.searchParams.get("ssl") ??
    databaseUrl.searchParams.get("sslmode") ??
    databaseUrl.searchParams.get("ssl-mode");

  return ["1", "true", "required", "require", "verify-ca", "verify_identity"].includes(
    sslValue?.toLowerCase() ?? "",
  );
}

function readCertificateAuthority(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.includes("BEGIN CERTIFICATE")) {
    return trimmed.replace(/\\n/g, "\n");
  }

  if (fs.existsSync(trimmed)) {
    return fs.readFileSync(trimmed, "utf8");
  }

  return trimmed.replace(/\\n/g, "\n");
}

function getSslConfig(enabled: boolean): PoolOptions["ssl"] | undefined {
  if (!enabled) {
    return undefined;
  }

  const ca = env.DB_SSL_CA ? readCertificateAuthority(env.DB_SSL_CA) : undefined;

  return ca
    ? {
        ca,
        rejectUnauthorized: true,
      }
    : {
        rejectUnauthorized: true,
      };
}

function getDatabaseConfig(): PoolOptions {
  if (env.DATABASE_URL) {
    const databaseUrl = new URL(env.DATABASE_URL);
    const ssl = getSslConfig(env.DB_SSL || isSslRequested(databaseUrl));

    return {
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || "3306"),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: databaseUrl.pathname.replace(/^\/+/, ""),
      ...(ssl ? { ssl } : {}),
    };
  }

  const ssl = getSslConfig(env.DB_SSL);

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ...(ssl ? { ssl } : {}),
  };
}

export const databaseConfig = getDatabaseConfig();

export function getDbPool() {
  if (!globalThis.reserveeDbPool) {
    globalThis.reserveeDbPool = mysql.createPool({
      ...databaseConfig,
      waitForConnections: true,
      connectionLimit: env.DB_CONNECTION_LIMIT,
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
