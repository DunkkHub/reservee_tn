import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { toDatabaseDateTime } from "@/lib/datetime";
import { hashValue } from "@/lib/security";

type RateLimitRow = RowDataPacket & {
  request_count: number;
  expires_at: string;
};

export async function consumeRateLimit(input: {
  key: string;
  windowMs: number;
  maxRequests: number;
}) {
  const pool = getDbPool();
  const bucketKey = hashValue(`${input.key}:${input.windowMs}`);
  const expiresAt = new Date(Date.now() + input.windowMs);

  await pool.execute<ResultSetHeader>(
    `
      DELETE FROM rate_limit_buckets
      WHERE expires_at <= UTC_TIMESTAMP()
        AND bucket_key = ?
    `,
    [bucketKey],
  );

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO rate_limit_buckets (bucket_key, request_count, expires_at)
      VALUES (?, 1, ?)
      ON DUPLICATE KEY UPDATE
        request_count = request_count + 1
    `,
    [bucketKey, toDatabaseDateTime(expiresAt)],
  );

  const [rows] = await pool.query<RateLimitRow[]>(
    `
      SELECT request_count, expires_at
      FROM rate_limit_buckets
      WHERE bucket_key = ?
      LIMIT 1
    `,
    [bucketKey],
  );

  const row = rows[0];
  const count = Number(row?.request_count ?? 0);
  const resetAt = new Date(`${row?.expires_at ?? toDatabaseDateTime(expiresAt)}Z`).getTime();
  const allowed = count <= input.maxRequests;

  return {
    allowed,
    remaining: allowed ? Math.max(input.maxRequests - count, 0) : 0,
    resetAt,
  };
}
