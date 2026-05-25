import fs from "node:fs";
import { URL } from "node:url";

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function isSslRequested(databaseUrl) {
  const sslValue =
    databaseUrl.searchParams.get("ssl") ??
    databaseUrl.searchParams.get("sslmode") ??
    databaseUrl.searchParams.get("ssl-mode");

  return ["1", "true", "required", "require", "verify-ca", "verify_identity"].includes(
    sslValue?.toLowerCase() ?? "",
  );
}

function readCertificateAuthority(value) {
  const trimmed = value?.trim();

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

function getSslConfig(enabled) {
  if (!enabled) {
    return undefined;
  }

  const ca = readCertificateAuthority(process.env.DB_SSL_CA);

  return ca
    ? {
        ca,
        rejectUnauthorized: true,
      }
    : {
        rejectUnauthorized: true,
      };
}

export function getDatabaseConfigFromEnv() {
  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const ssl = getSslConfig(isTruthy(process.env.DB_SSL) || isSslRequested(databaseUrl));

    return {
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || "3306"),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: databaseUrl.pathname.replace(/^\/+/, ""),
      ...(ssl ? { ssl } : {}),
    };
  }

  const ssl = getSslConfig(isTruthy(process.env.DB_SSL));

  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "reservee_tn",
    ...(ssl ? { ssl } : {}),
  };
}

export function getAdminDatabaseConfigFromEnv() {
  const config = getDatabaseConfigFromEnv();
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    ...(config.ssl ? { ssl: config.ssl } : {}),
    multipleStatements: true,
  };
}
