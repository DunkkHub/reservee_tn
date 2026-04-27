import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import { fromDatabaseDateTime } from "@/lib/datetime";
import type { ActivityLogEntry, ActivityType } from "@/lib/types";

type ActivityLogRow = RowDataPacket & {
  sequence_id: number;
  id: string;
  type: ActivityType;
  business_id: string | null;
  booking_id: string | null;
  actor_user_id: string | null;
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
    createdAt: fromDatabaseDateTime(row.created_at) ?? new Date(0).toISOString(),
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
  actorUserId?: string | null;
  summary: string;
}) {
  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO activity_logs (id, type, business_id, booking_id, actor_user_id, summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.type,
      input.businessId ?? null,
      input.bookingId ?? null,
      input.actorUserId ?? null,
      input.summary.trim(),
    ],
  );

  const [rows] = await pool.query<ActivityLogRow[]>(
    "SELECT * FROM activity_logs WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] ? mapRowToActivityLog(rows[0]) : null;
}

export async function findLatestActivitySequence(options: {
  businessId?: string;
} = {}) {
  const pool = getDbPool();

  if (options.businessId) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT COALESCE(MAX(sequence_id), 0) AS sequence
        FROM activity_logs
        WHERE business_id = ?
      `,
      [options.businessId],
    );

    return Number(rows[0]?.sequence ?? 0);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COALESCE(MAX(sequence_id), 0) AS sequence
      FROM activity_logs
    `,
  );

  return Number(rows[0]?.sequence ?? 0);
}
