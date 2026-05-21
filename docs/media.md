# Media

## Current architecture

Media is handled as metadata-first, not as a fake “fully working uploads” claim.

Current stored fields:

- URL
- alt text
- type (`cover` or `gallery`)
- storage provider
- storage key
- MIME type
- file size

## Available providers

- `local`
- `external_url`
- `s3`
- `r2`
- `cloudinary`

Today, the repository includes:

- a local path-oriented provider abstraction
- validation for provider metadata
- route-level ownership checks
- database columns for storage metadata

## What is not implemented yet

- direct browser-to-storage binary upload flow
- signed upload URLs
- server-side image scanning/transforms
- CDN invalidation workflow

## Environment variables

- `MEDIA_STORAGE_PROVIDER`
- `MEDIA_LOCAL_UPLOAD_DIR`
- `MEDIA_PUBLIC_BASE_PATH`
- `MEDIA_UPLOAD_MAX_BYTES`

## Recommended next steps

1. Add a signed upload endpoint for S3/R2/Cloudinary
2. Enforce MIME sniffing and server-side size validation on binary uploads
3. Add image transformation and thumbnail strategy
4. Add moderation and orphan-cleanup jobs
