import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import type { PaginationOptions } from "@/lib/pagination";
import type { WaitlistRequest } from "@/lib/types";

type WaitlistRow = RowDataPacket & {
  id: string;
  business_id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_note: string | null;
  preferred_date: string | null;
  preferred_time: string;
  created_at: string;
};

type WaitlistListOptions = Partial<Pick<PaginationOptions, "limit" | "offset">>;

function normalizeWaitlistListOptions(options: WaitlistListOptions = {}) {
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

function mapRowToWaitlistRequest(row: WaitlistRow): WaitlistRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    preferredDate: row.preferred_date ?? "",
    preferredTime: row.preferred_time ?? "",
    note: row.customer_note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function findWaitlistRequestsByBusiness(
  businessId: string,
  options: WaitlistListOptions = {},
) {
  const pool = getDbPool();
  const { limit, offset } = normalizeWaitlistListOptions(options);
  const [rows] = await pool.query<WaitlistRow[]>(
    `
      SELECT id, business_id, service_id, customer_name, customer_phone, customer_note, preferred_date, preferred_time, created_at
      FROM waitlist_requests
      WHERE business_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT ?
      OFFSET ?
    `,
    [businessId, limit, offset],
  );

  return rows.map(mapRowToWaitlistRequest);
}

export async function countWaitlistRequestsByBusiness(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
    `
      SELECT COUNT(*) AS count
      FROM waitlist_requests
      WHERE business_id = ? AND status = 'active'
    `,
    [businessId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function createWaitlistRequest(input: {
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
}) {
  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO waitlist_requests (
        id,
        business_id,
        service_id,
        customer_name,
        customer_phone,
        customer_note,
        preferred_date,
        preferred_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.businessId,
      input.serviceId,
      input.customerName.trim(),
      input.customerPhone.trim(),
      input.note?.trim() ?? null,
      input.preferredDate,
      input.preferredTime.trim(),
    ],
  );

  const [rows] = await pool.query<WaitlistRow[]>(
    `
      SELECT id, business_id, service_id, customer_name, customer_phone, customer_note, preferred_date, preferred_time, created_at
      FROM waitlist_requests
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapRowToWaitlistRequest(rows[0]) : null;
}
