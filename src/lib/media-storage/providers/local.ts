import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import type { MediaStorageProvider } from "@/lib/media-storage/types";
import { assertSupportedMediaFile } from "@/lib/media-storage/validation";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export const localMediaStorageProvider: MediaStorageProvider = {
  name: "local",
  async upload(input) {
    assertSupportedMediaFile({
      mimeType: input.mimeType,
      fileSizeBytes: input.bytes.byteLength,
    });

    const directory = path.resolve(process.cwd(), env.MEDIA_LOCAL_UPLOAD_DIR, input.businessId);
    await mkdir(directory, { recursive: true });

    const safeFileName = `${Date.now()}-${sanitizeFileName(input.fileName)}`;
    const absolutePath = path.join(directory, safeFileName);
    await writeFile(absolutePath, input.bytes);

    const relativeBasePath = env.MEDIA_PUBLIC_BASE_PATH.replace(/\/+$/u, "");
    const url = `${relativeBasePath}/${input.businessId}/${safeFileName}`;

    return {
      storageProvider: "local",
      storageKey: `${input.businessId}/${safeFileName}`,
      url,
      mimeType: input.mimeType,
      fileSizeBytes: input.bytes.byteLength,
    };
  },
};
