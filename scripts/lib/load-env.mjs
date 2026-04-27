import fs from "node:fs/promises";
import path from "node:path";

function parseValue(rawValue) {
  const trimmed = rawValue.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export async function loadEnvFiles(projectRoot) {
  for (const filename of [".env", ".env.local"]) {
    const filePath = path.join(projectRoot, filename);

    try {
      const contents = await fs.readFile(filePath, "utf8");

      for (const line of contents.split(/\r?\n/u)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) {
          continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = parseValue(trimmed.slice(separatorIndex + 1));

        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }
}
