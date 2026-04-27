import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  getAdminDatabaseConfigFromEnv,
  getDatabaseConfigFromEnv,
} from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

const connection = await mysql.createConnection({
  ...getAdminDatabaseConfigFromEnv(),
  multipleStatements: true,
});
const targetDatabase = getDatabaseConfigFromEnv().database;

const schemaFile = path.join(projectRoot, "database", "reservee_tn.sql");
const migrationsDir = path.join(projectRoot, "database", "migrations");

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );

  const [tableRows] = await connection.query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = ?
    `,
    [targetDatabase],
  );
  const existingTableCount = Number(tableRows[0]?.count ?? 0);

  if (existingTableCount === 0) {
    const schemaSql = await fs.readFile(schemaFile, "utf8");
    await connection.query(schemaSql);
  } else {
    console.log(`Existing schema detected in ${targetDatabase}; skipping base schema bootstrap.`);
  }

  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const filename of migrationFiles) {
    const migrationSql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
    await connection.query(migrationSql);
    console.log(`Applied migration: ${filename}`);
  }

  console.log("Database schema is up to date.");
} finally {
  await connection.end();
}
