import "server-only";

import { env } from "@/lib/env";
import { localMediaStorageProvider } from "@/lib/media-storage/providers/local";
import type { MediaStorageProvider } from "@/lib/media-storage/types";

export function getMediaStorageProvider(): MediaStorageProvider {
  switch (env.MEDIA_STORAGE_PROVIDER) {
    case "local":
      return localMediaStorageProvider;
    default:
      throw new Error(
        `Media uploads are not configured for provider ${env.MEDIA_STORAGE_PROVIDER}.`,
      );
  }
}
