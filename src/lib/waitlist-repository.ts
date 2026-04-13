import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
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

export async function findWaitlistRequestsByBusiness(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<WaitlistRow[]>(
    `
      SELECT id, business_id, service_id, customer_name, customer_phone, customer_note, preferred_date, preferred_time, created_at
      FROM waitlist_requests
      WHERE business_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `,
    [businessId],
  );

  return rows.map(mapRowToWaitlistRequest);
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
