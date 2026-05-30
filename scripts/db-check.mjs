import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

const databaseConfig = getDatabaseConfigFromEnv();

console.log("\n=== Database Connection Check ===\n");
console.log(`Host: ${databaseConfig.host}`);
console.log(`Port: ${databaseConfig.port}`);
console.log(`Database: ${databaseConfig.database}`);
console.log(`User: ${databaseConfig.user}`);
console.log(`SSL Enabled: ${databaseConfig.ssl ? "yes" : "no"}`);
console.log("");

let connection;
try {
  console.log("Attempting to connect...");
  connection = await mysql.createConnection(databaseConfig);
  console.log("✓ Connection successful\n");
} catch (error) {
  console.error("✗ Connection failed:", error.message);
  process.exit(1);
}

try {
  const requiredTables = [
    "app_users",
    "account",
    "session",
    "verification",
    "business_profiles",
    "customer_profiles",
    "services",
    "bookings",
  ];

  console.log("Checking for required tables:\n");

  const [rows] = await connection.query(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `,
    [databaseConfig.database],
  );

  const existingTables = new Set(rows.map((row) => row.TABLE_NAME));

  let allTablesExist = true;

  for (const tableName of requiredTables) {
    if (existingTables.has(tableName)) {
      console.log(`✓ ${tableName}`);
    } else {
      console.log(`✗ ${tableName} (MISSING)`);
      allTablesExist = false;
    }
  }

  console.log("");

  if (!allTablesExist) {
    console.log("⚠ Some tables are missing. Run: npm run db:migrate\n");
    await connection.end();
    process.exit(1);
  }

  console.log("✓ All required tables exist\n");
  console.log("=== Database is ready ===\n");
} catch (error) {
  console.error("✗ Error checking tables:", error.message);
  process.exit(1);
} finally {
  await connection.end();
}
