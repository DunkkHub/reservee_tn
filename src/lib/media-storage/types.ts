export type MediaStorageProviderName =
  | "local"
  | "external_url"
  | "s3"
  | "r2"
  | "cloudinary";

export interface MediaUploadMetadata {
  storageProvider: MediaStorageProviderName;
  storageKey: string;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface MediaStorageProvider {
  name: MediaStorageProviderName;
  upload(input: {
    businessId: string;
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<MediaUploadMetadata>;
}
