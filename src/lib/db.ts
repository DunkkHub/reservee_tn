import "server-only";

import mysql, { type Pool } from "mysql2/promise";

declare global {
  var reserveeDbPool: Pool | undefined;
}

export const databaseConfig = {
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? "3306"),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "reservee_tn",
};

export function getDbPool() {
  if (!globalThis.reserveeDbPool) {
    globalThis.reserveeDbPool = mysql.createPool({
      ...databaseConfig,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
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
      return "MySQL is not reachable. Start Apache and MySQL in XAMPP first.";
    case "ER_BAD_DB_ERROR":
      return "Database `reservee_tn` does not exist yet. Import `database/reservee_tn.sql` in phpMyAdmin first.";
    case "ER_ACCESS_DENIED_ERROR":
      return "MySQL credentials were rejected. Check `.env.local` against your XAMPP phpMyAdmin settings.";
    default:
      return "The MySQL backend is not ready yet. Verify XAMPP is running and import the provided SQL schema.";
  }
}
