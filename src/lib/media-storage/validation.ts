import { env } from "@/lib/env";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function assertSupportedMediaFile(input: {
  mimeType: string;
  fileSizeBytes: number;
}) {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new Error("Only JPEG, PNG, and WebP images are supported.");
  }

  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > env.MEDIA_UPLOAD_MAX_BYTES) {
    throw new Error(
      `Images must be between 1 byte and ${env.MEDIA_UPLOAD_MAX_BYTES} bytes.`,
    );
  }
}
