import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

const config = getDatabaseConfigFromEnv();

console.log("Database connection details");
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
console.log(`Database: ${config.database}`);
console.log(`User: ${config.user}`);
console.log("");
console.log("Open phpMyAdmin or your preferred MySQL GUI with the values above.");
console.log("If you use XAMPP locally, phpMyAdmin is usually available at http://localhost/phpmyadmin/");
