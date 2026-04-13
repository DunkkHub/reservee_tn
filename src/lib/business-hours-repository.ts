import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import type { BusinessHours, BreakWindow } from "@/lib/types";

type BusinessHoursRow = RowDataPacket & {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  breaks: string | null;
};

function mapRowToBusinessHours(row: BusinessHoursRow): BusinessHours {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: row.is_closed,
    breaks: row.breaks ? JSON.parse(row.breaks) : undefined,
  };
}

export async function findBusinessHours(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessHoursRow[]>(
    `
      SELECT * FROM business_hours
      WHERE business_id = ?
      ORDER BY day_of_week ASC
    `,
    [businessId],
  );

  return rows.map(mapRowToBusinessHours);
}

export async function updateBusinessHours(
  businessId: string,
  dayOfWeek: number,
  updates: {
    openTime?: string;
    closeTime?: string;
    isClosed?: boolean;
    breaks?: BreakWindow[];
  },
) {
  const pool = getDbPool();

  const updateFields: string[] = [];
  const values: unknown[] = [];

  if (updates.openTime !== undefined) {
    updateFields.push("open_time = ?");
    values.push(updates.openTime);
  }
  if (updates.closeTime !== undefined) {
    updateFields.push("close_time = ?");
    values.push(updates.closeTime);
  }
  if (updates.isClosed !== undefined) {
    updateFields.push("is_closed = ?");
    values.push(updates.isClosed ? 1 : 0);
  }
  if (updates.breaks !== undefined) {
    updateFields.push("breaks = ?");
    values.push(JSON.stringify(updates.breaks));
  }

  if (updateFields.length === 0) {
    return;
  }

  values.push(businessId, dayOfWeek);

  await pool.execute<ResultSetHeader>(
    `
      UPDATE business_hours
      SET ${updateFields.join(", ")}
      WHERE business_id = ? AND day_of_week = ?
    `,
    values,
  );
}

export async function ensureBusinessHoursExist(businessId: string) {
  const pool = getDbPool();

  // Check if hours exist
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM business_hours WHERE business_id = ? LIMIT 1",
    [businessId],
  );

  if (existing.length > 0) {
    return;
  }

  // Create default hours (9 AM - 6 PM, Monday-Friday; closed weekends)
  const defaultHours = [
    { day: 0, open: "09:00", close: "18:00", closed: true }, // Sunday
    { day: 1, open: "09:00", close: "18:00", closed: false }, // Monday
    { day: 2, open: "09:00", close: "18:00", closed: false }, // Tuesday
    { day: 3, open: "09:00", close: "18:00", closed: false }, // Wednesday
    { day: 4, open: "09:00", close: "18:00", closed: false }, // Thursday
    { day: 5, open: "09:00", close: "18:00", closed: false }, // Friday
    { day: 6, open: "09:00", close: "18:00", closed: true }, // Saturday
  ];

  for (const hour of defaultHours) {
    await pool.execute<ResultSetHeader>(
      `
        INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [randomUUID(), businessId, hour.day, hour.open, hour.close, hour.closed ? 1 : 0],
    );
  }
}
