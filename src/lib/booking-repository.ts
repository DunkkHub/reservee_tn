import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import type { Booking, BookingStatus } from "@/lib/types";

type BookingRow = RowDataPacket & {
  id: string;
  reference_code: string;
  business_id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_note: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  source: "web" | "dashboard";
  expires_at: string | null;
  reschedule_requested_at: string | null;
  status_updated_at: string | null;
  created_at: string;
};

function mapRowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    businessId: row.business_id,
    serviceId: row.service_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerNote: row.customer_note ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    source: row.source,
    expiresAt: row.expires_at ?? null,
    rescheduleRequestedAt: row.reschedule_requested_at ?? null,
    statusUpdatedAt: row.status_updated_at ?? null,
    createdAt: row.created_at,
  };
}

export function generateBookingReferenceCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createBooking(input: {
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: "web" | "dashboard";
  expiresAt?: string | null;
}) {
  const pool = getDbPool();

  const bookingId = randomUUID();
  const referenceCode = generateBookingReferenceCode();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO bookings (
        id,
        reference_code,
        business_id,
        service_id,
        customer_name,
        customer_phone,
        customer_note,
        start_at,
        end_at,
        status,
        source,
        expires_at,
        status_updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      bookingId,
      referenceCode,
      input.businessId,
      input.serviceId,
      input.customerName.trim(),
      input.customerPhone.trim(),
      input.customerNote?.trim() ?? null,
      input.startAt,
      input.endAt,
      input.status,
      input.source,
      input.expiresAt ?? null,
    ],
  );

  return await findBookingById(bookingId);
}

export async function findBookingById(id: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BookingRow[]>(
    "SELECT * FROM bookings WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ? mapRowToBooking(rows[0]) : null;
}

export async function findBookingByReference(referenceCode: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BookingRow[]>(
    "SELECT * FROM bookings WHERE reference_code = ? LIMIT 1",
    [referenceCode.toUpperCase()],
  );
  return rows[0] ? mapRowToBooking(rows[0]) : null;
}

export async function findBookingsByBusiness(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BookingRow[]>(
    `
      SELECT * FROM bookings
      WHERE business_id = ?
      ORDER BY start_at DESC
    `,
    [businessId],
  );
  return rows.map(mapRowToBooking);
}

export async function findBookingsByPhone(customerPhone: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BookingRow[]>(
    `
      SELECT * FROM bookings
      WHERE customer_phone = ?
      ORDER BY start_at DESC
      LIMIT 50
    `,
    [customerPhone.trim()],
  );
  return rows.map(mapRowToBooking);
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
) {
  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET status = ?, status_updated_at = NOW()
      WHERE id = ?
    `,
    [status, bookingId],
  );

  return await findBookingById(bookingId);
}

export async function requestBookingReschedule(bookingId: string) {
  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET reschedule_requested_at = NOW()
      WHERE id = ?
    `,
    [bookingId],
  );

  return await findBookingById(bookingId);
}

export async function expireOldBookings() {
  const pool = getDbPool();

  await pool.execute<ResultSetHeader>(
    `
      UPDATE bookings
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `,
  );
}

export async function checkSlotAvailability(input: {
  businessId: string;
  startAt: string;
  endAt: string;
}) {
  const pool = getDbPool();

  // Check for conflicting bookings
  const [bookings] = await pool.query<BookingRow[]>(
    `
      SELECT COUNT(*) as count FROM bookings
      WHERE business_id = ?
        AND status IN ('confirmed', 'pending')
        AND start_at < ?
        AND end_at > ?
    `,
    [input.businessId, input.endAt, input.startAt],
  );

  // Check for blocked slots
  const [blocked] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) as count FROM blocked_slots
      WHERE business_id = ?
        AND start_at < ?
        AND end_at > ?
    `,
    [input.businessId, input.endAt, input.startAt],
  );

  return bookings[0].count === 0 && blocked[0].count === 0;
}
