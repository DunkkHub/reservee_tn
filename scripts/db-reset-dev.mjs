import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getAdminDatabaseConfigFromEnv, getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

if (process.env.NODE_ENV === "production") {
  throw new Error("db:reset-dev is blocked in production.");
}

const databaseConfig = getDatabaseConfigFromEnv();
const connection = await mysql.createConnection({
  ...getAdminDatabaseConfigFromEnv(),
  multipleStatements: true,
});

try {
  await connection.query(`DROP DATABASE IF EXISTS \`${databaseConfig.database}\``);
  console.log(`Dropped database ${databaseConfig.database}.`);
} finally {
  await connection.end();
}

await import("./db-migrate.mjs");
await import("./seed-dev-db.mjs");
