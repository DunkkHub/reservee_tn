import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  getDatabaseConfigFromEnv,
} from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

const databaseConfig = getDatabaseConfigFromEnv();
const targetDatabase = databaseConfig.database;

const schemaFile = path.join(projectRoot, "database", "reservee_tn.sql");
const migrationsDir = path.join(projectRoot, "database", "migrations");

async function createTargetConnection() {
  try {
    return await mysql.createConnection({
      ...databaseConfig,
      multipleStatements: true,
    });
  } catch (error) {
    if (error?.code !== "ER_BAD_DB_ERROR") {
      throw error;
    }

    const adminConnection = await mysql.createConnection({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
      ...(databaseConfig.ssl ? { ssl: databaseConfig.ssl } : {}),
      multipleStatements: true,
    });

    try {
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await adminConnection.end();
    }

    return mysql.createConnection({
      ...databaseConfig,
      multipleStatements: true,
    });
  }
}

const connection = await createTargetConnection();

try {
  // List of required core tables
  const requiredTables = [
    'app_users',
    'account',
    'session',
    'verification',
    'business_profiles',
    'customer_profiles',
    'services',
    'bookings',
  ];

  // Query to check for required tables
  const [existingTablesRows] = await connection.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [targetDatabase],
  );
  const existingTables = new Set(existingTablesRows.map(row => row.TABLE_NAME || row.table_name));

  const missingTables = requiredTables.filter(t => !existingTables.has(t));

  if (missingTables.length > 0) {
    console.log(`Missing required tables: ${missingTables.join(', ')}. Bootstrapping base schema...`);
    const schemaSql = await fs.readFile(schemaFile, "utf8");
    await connection.query(schemaSql);
  } else {
    console.log(`All required core tables exist in ${targetDatabase}; skipping base schema bootstrap.`);
  }

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const filename of migrationFiles) {
    const migrationSql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
    try {
      await connection.query(migrationSql);
      console.log(`Applied migration: ${filename}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
        console.log(`Skipped migration: ${filename} (columns/keys already exist)`);
      } else {
        throw e;
      }
    }
  }

  console.log("Database schema is up to date.");
} finally {
  await connection.end();
}
