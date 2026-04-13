import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import type { ActivityLogEntry, ActivityType } from "@/lib/types";

type ActivityLogRow = RowDataPacket & {
  id: string;
  type: ActivityType;
  business_id: string | null;
  booking_id: string | null;
  summary: string;
  created_at: string;
};

function mapRowToActivityLog(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    type: row.type,
    businessId: row.business_id ?? undefined,
    bookingId: row.booking_id ?? undefined,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

export async function findActivityLogs(options: {
  businessId?: string;
  limit?: number;
} = {}) {
  const pool = getDbPool();
  const limit = options.limit ?? 80;

  if (options.businessId) {
    const [rows] = await pool.query<ActivityLogRow[]>(
      `
        SELECT * FROM activity_logs
        WHERE business_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [options.businessId, limit],
    );

    return rows.map(mapRowToActivityLog);
  }

  const [rows] = await pool.query<ActivityLogRow[]>(
    `
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit],
  );

  return rows.map(mapRowToActivityLog);
}

export async function recordActivity(input: {
  type: ActivityType;
  businessId?: string;
  bookingId?: string;
  summary: string;
}) {
  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO activity_logs (id, type, business_id, booking_id, summary)
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, input.type, input.businessId ?? null, input.bookingId ?? null, input.summary.trim()],
  );

  const [rows] = await pool.query<ActivityLogRow[]>(
    "SELECT * FROM activity_logs WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] ? mapRowToActivityLog(rows[0]) : null;
}
