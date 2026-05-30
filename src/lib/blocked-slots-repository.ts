import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import { fromDatabaseDateTime, toDatabaseDateTime } from "@/lib/datetime";
import type { PaginationOptions } from "@/lib/pagination";
import type { BlockedSlot } from "@/lib/types";

type BlockedSlotRow = RowDataPacket & {
  id: string;
  business_id: string;
  start_at: string;
  end_at: string;
  reason: string;
  created_at: string;
};

type BlockedSlotListOptions = Partial<Pick<PaginationOptions, "limit" | "offset">>;

function normalizeBlockedSlotListOptions(options: BlockedSlotListOptions = {}) {
  const limit =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.min(Math.max(1, Math.floor(options.limit)), 100)
      : 50;
  const offset =
    typeof options.offset === "number" && Number.isFinite(options.offset)
      ? Math.max(0, Math.floor(options.offset))
      : 0;

  return { limit, offset };
}

function mapRowToBlockedSlot(row: BlockedSlotRow): BlockedSlot {
  return {
    id: row.id,
    businessId: row.business_id,
    startAt: fromDatabaseDateTime(row.start_at) ?? new Date(0).toISOString(),
    endAt: fromDatabaseDateTime(row.end_at) ?? new Date(0).toISOString(),
    reason: row.reason,
  };
}

export async function findBlockedSlots(
  businessId: string,
  options: BlockedSlotListOptions = {},
) {
  const pool = getDbPool();
  const { limit, offset } = normalizeBlockedSlotListOptions(options);
  const [rows] = await pool.query<BlockedSlotRow[]>(
    `
      SELECT id, business_id, start_at, end_at, reason
      FROM availability_exceptions
      WHERE business_id = ?
        AND exception_type = 'blocked'
      ORDER BY start_at DESC
      LIMIT ?
      OFFSET ?
    `,
    [businessId, limit, offset],
  );

  return rows.map(mapRowToBlockedSlot);
}

export async function countBlockedSlots(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
    `
      SELECT COUNT(*) AS count
      FROM availability_exceptions
      WHERE business_id = ?
        AND exception_type = 'blocked'
    `,
    [businessId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function findBlockedSlotsByDate(businessId: string, date: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BlockedSlotRow[]>(
    `
      SELECT id, business_id, start_at, end_at, reason
      FROM availability_exceptions
      WHERE business_id = ?
        AND exception_type = 'blocked'
        AND DATE(start_at) = ?
      ORDER BY start_at ASC
    `,
    [businessId, date],
  );

  return rows.map(mapRowToBlockedSlot);
}

export async function createBlockedSlot(input: {
  businessId: string;
  startAt: string;
  endAt: string;
  reason: string;
}) {
  const pool = getDbPool();

  const slotId = randomUUID();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO availability_exceptions (id, business_id, start_at, end_at, reason, exception_type)
      VALUES (?, ?, ?, ?, ?, 'blocked')
    `,
    [
      slotId,
      input.businessId,
      toDatabaseDateTime(input.startAt),
      toDatabaseDateTime(input.endAt),
      input.reason.trim(),
    ],
  );

  const [rows] = await pool.query<BlockedSlotRow[]>(
    `
      SELECT id, business_id, start_at, end_at, reason
      FROM availability_exceptions
      WHERE id = ? LIMIT 1
    `,
    [slotId],
  );

  return rows[0] ? mapRowToBlockedSlot(rows[0]) : null;
}

export async function deleteBlockedSlot(slotId: string, businessId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    "DELETE FROM availability_exceptions WHERE id = ? AND business_id = ?",
    [slotId, businessId],
  );
}

export async function checkBlockedSlotOverlap(input: {
  businessId: string;
  startAt: string;
  endAt: string;
  excludeId?: string;
}) {
  const pool = getDbPool();

  let query =
    "SELECT COUNT(*) as count FROM availability_exceptions WHERE business_id = ? AND exception_type = 'blocked' AND start_at < ? AND end_at > ?";
  const params: unknown[] = [
    input.businessId,
    toDatabaseDateTime(input.endAt),
    toDatabaseDateTime(input.startAt),
  ];

  if (input.excludeId) {
    query += " AND id != ?";
    params.push(input.excludeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows[0].count > 0;
}
