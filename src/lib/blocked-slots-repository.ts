import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import type { BlockedSlot } from "@/lib/types";

type BlockedSlotRow = RowDataPacket & {
  id: string;
  business_id: string;
  start_at: string;
  end_at: string;
  reason: string;
  created_at: string;
};

function mapRowToBlockedSlot(row: BlockedSlotRow): BlockedSlot {
  return {
    id: row.id,
    businessId: row.business_id,
    startAt: row.start_at,
    endAt: row.end_at,
    reason: row.reason,
  };
}

export async function findBlockedSlots(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BlockedSlotRow[]>(
    `
      SELECT * FROM blocked_slots
      WHERE business_id = ?
      ORDER BY start_at DESC
    `,
    [businessId],
  );

  return rows.map(mapRowToBlockedSlot);
}

export async function findBlockedSlotsByDate(businessId: string, date: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BlockedSlotRow[]>(
    `
      SELECT * FROM blocked_slots
      WHERE business_id = ?
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
      INSERT INTO blocked_slots (id, business_id, start_at, end_at, reason)
      VALUES (?, ?, ?, ?, ?)
    `,
    [slotId, input.businessId, input.startAt, input.endAt, input.reason.trim()],
  );

  const [rows] = await pool.query<BlockedSlotRow[]>(
    "SELECT * FROM blocked_slots WHERE id = ? LIMIT 1",
    [slotId],
  );

  return rows[0] ? mapRowToBlockedSlot(rows[0]) : null;
}

export async function deleteBlockedSlot(slotId: string, businessId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    "DELETE FROM blocked_slots WHERE id = ? AND business_id = ?",
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
    "SELECT COUNT(*) as count FROM blocked_slots WHERE business_id = ? AND start_at < ? AND end_at > ?";
  const params: unknown[] = [input.businessId, input.endAt, input.startAt];

  if (input.excludeId) {
    query += " AND id != ?";
    params.push(input.excludeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows[0].count > 0;
}
