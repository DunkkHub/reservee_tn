import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import { ApiRouteError } from "@/lib/api-response";
import {
  canRequestReschedule,
  getBookingTransitionErrorMessage,
  isBookingBlockingStatus,
} from "@/lib/booking-lifecycle";
import { getDbPool } from "@/lib/db";
import {
  fromDatabaseDateTime,
  toDatabaseDateTime,
} from "@/lib/datetime";
import { normalizePhone } from "@/lib/contact-utils";
import type { Booking, BookingStatus } from "@/lib/types";

const SLOT_LOCK_STEP_MINUTES = 5;

type BookingRow = RowDataPacket & {
  id: string;
  reference_code: string;
  business_id: string;
  service_id: string;
  customer_user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_phone_normalized: string;
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
    customerUserId: row.customer_user_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerNote: row.customer_note ?? undefined,
    startAt: fromDatabaseDateTime(row.start_at) ?? new Date(0).toISOString(),
    endAt: fromDatabaseDateTime(row.end_at) ?? new Date(0).toISOString(),
    status: row.status,
    source: row.source,
    expiresAt: fromDatabaseDateTime(row.expires_at),
    rescheduleRequestedAt: fromDatabaseDateTime(row.reschedule_requested_at),
    statusUpdatedAt: fromDatabaseDateTime(row.status_updated_at),
    createdAt: fromDatabaseDateTime(row.created_at) ?? new Date(0).toISOString(),
  };
}

function isDuplicateEntryError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

function buildSlotLockStarts(startAt: Date, endAt: Date) {
  const slots: Date[] = [];
  let cursor = new Date(startAt);

  while (cursor < endAt) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + SLOT_LOCK_STEP_MINUTES * 60 * 1000);
  }

  return slots;
}

export function generateBookingReferenceCode() {
  return randomBytes(5)
    .toString("base64url")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase();
}

async function createBookingEvent(
  connection: PoolConnection,
  input: {
    bookingId: string;
    businessId: string;
    actorUserId?: string | null;
    actorRole: "customer" | "shop" | "admin" | "system" | "public";
    eventType: "created" | "status_changed" | "reschedule_requested";
    previousStatus?: BookingStatus | null;
    nextStatus?: BookingStatus | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await connection.execute<ResultSetHeader>(
    `
      INSERT INTO booking_events (
        id,
        booking_id,
        business_id,
        actor_user_id,
        actor_role,
        event_type,
        previous_status,
        next_status,
        reason,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      input.bookingId,
      input.businessId,
      input.actorUserId ?? null,
      input.actorRole,
      input.eventType,
      input.previousStatus ?? null,
      input.nextStatus ?? null,
      input.reason ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

async function releaseSlotLocks(connection: PoolConnection, bookingId: string) {
  await connection.execute<ResultSetHeader>(
    `
      DELETE FROM booking_slot_locks
      WHERE booking_id = ?
    `,
    [bookingId],
  );
}

async function createSlotLocks(
  connection: PoolConnection,
  bookingId: string,
  businessId: string,
  startAt: Date,
  endAt: Date,
) {
  for (const slotStart of buildSlotLockStarts(startAt, endAt)) {
    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO booking_slot_locks (id, booking_id, business_id, slot_start_at)
        VALUES (?, ?, ?, ?)
      `,
      [randomUUID(), bookingId, businessId, toDatabaseDateTime(slotStart)],
    );
  }
}

export async function expireOldBookings(connection?: PoolConnection) {
  const executor = connection ?? getDbPool();
  const [rows] = await executor.query<RowDataPacket[]>(
    `
      SELECT id, business_id
      FROM bookings
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= UTC_TIMESTAMP()
    `,
  );

  for (const row of rows) {
    await executor.execute<ResultSetHeader>(
      `
        UPDATE bookings
        SET status = 'expired',
            status_updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [row.id],
    );

    await executor.execute<ResultSetHeader>(
      `
        DELETE FROM booking_slot_locks
        WHERE booking_id = ?
      `,
      [row.id],
    );

    if (connection) {
      await createBookingEvent(connection, {
        bookingId: row.id,
        businessId: row.business_id,
        actorRole: "system",
        eventType: "status_changed",
        previousStatus: "pending",
        nextStatus: "expired",
        reason: "pending_expired",
      });
    }
  }
}

export async function createBooking(input: {
  businessId: string;
  serviceId: string;
  customerUserId?: string | null;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: "web" | "dashboard";
  expiresAt?: string | null;
  actorUserId?: string | null;
  actorRole: "customer" | "shop" | "admin" | "public";
}) {
  const pool = getDbPool();
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const connection = await pool.getConnection();
    const bookingId = randomUUID();
    const referenceCode = generateBookingReferenceCode();
    const startAtDate = new Date(input.startAt);
    const endAtDate = new Date(input.endAt);

    try {
      await connection.beginTransaction();
      await expireOldBookings(connection);

      const [conflicts] = await connection.query<RowDataPacket[]>(
        `
          SELECT id
          FROM bookings
          WHERE business_id = ?
            AND status IN ('pending', 'confirmed')
            AND start_at < ?
            AND end_at > ?
          FOR UPDATE
        `,
        [
          input.businessId,
          toDatabaseDateTime(endAtDate),
          toDatabaseDateTime(startAtDate),
        ],
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        return {
          ok: false as const,
          status: 409,
          error: "This time slot is no longer available.",
        };
      }

      const [blocked] = await connection.query<RowDataPacket[]>(
        `
          SELECT id
          FROM availability_exceptions
          WHERE business_id = ?
            AND start_at < ?
            AND end_at > ?
          FOR UPDATE
        `,
        [
          input.businessId,
          toDatabaseDateTime(endAtDate),
          toDatabaseDateTime(startAtDate),
        ],
      );

      if (blocked.length > 0) {
        await connection.rollback();
        return {
          ok: false as const,
          status: 409,
          error: "This time slot is no longer available.",
        };
      }

      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO bookings (
            id,
            reference_code,
            business_id,
            service_id,
            customer_user_id,
            customer_name,
            customer_phone,
            customer_phone_normalized,
            customer_note,
            start_at,
            end_at,
            status,
            source,
            expires_at,
            status_updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
        `,
        [
          bookingId,
          referenceCode,
          input.businessId,
          input.serviceId,
          input.customerUserId ?? null,
          input.customerName.trim(),
          input.customerPhone.trim(),
          normalizePhone(input.customerPhone),
          input.customerNote?.trim() ?? null,
          toDatabaseDateTime(startAtDate),
          toDatabaseDateTime(endAtDate),
          input.status,
          input.source,
          input.expiresAt ? toDatabaseDateTime(input.expiresAt) : null,
        ],
      );

      if (isBookingBlockingStatus(input.status)) {
        await createSlotLocks(
          connection,
          bookingId,
          input.businessId,
          startAtDate,
          endAtDate,
        );
      }

      await createBookingEvent(connection, {
        bookingId,
        businessId: input.businessId,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole,
        eventType: "created",
        nextStatus: input.status,
        metadata: { source: input.source },
      });

      await connection.commit();
      const booking = await findBookingById(bookingId);

      return {
        ok: true as const,
        status: 201,
        booking,
      };
    } catch (error) {
      await connection.rollback();

      if (isDuplicateEntryError(error)) {
        if (attempt === maxAttempts - 1) {
          return {
            ok: false as const,
            status: 409,
            error: "This time slot is no longer available.",
          };
        }

        continue;
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    ok: false as const,
    status: 409,
    error: "This time slot is no longer available.",
  };
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
  await expireOldBookings();
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
  await expireOldBookings();
  const [rows] = await pool.query<BookingRow[]>(
    `
      SELECT * FROM bookings
      WHERE customer_phone_normalized = ?
      ORDER BY start_at DESC
      LIMIT 50
    `,
    [normalizePhone(customerPhone)],
  );
  return rows.map(mapRowToBooking);
}

export async function findAllBookings(limit = 200) {
  const pool = getDbPool();
  await expireOldBookings();
  const [rows] = await pool.query<BookingRow[]>(
    `
      SELECT * FROM bookings
      ORDER BY start_at DESC
      LIMIT ?
    `,
    [limit],
  );
  return rows.map(mapRowToBooking);
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  actor?: {
    userId?: string | null;
    role: "customer" | "shop" | "admin" | "system" | "public";
    reason?: string | null;
  },
) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await expireOldBookings(connection);

    const [rows] = await connection.query<BookingRow[]>(
      `
        SELECT *
        FROM bookings
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [bookingId],
    );

    const existing = rows[0];

    if (!existing) {
      await connection.rollback();
      return null;
    }

    if (existing.status !== status) {
      const transitionError = getBookingTransitionErrorMessage(
        existing.status,
        status,
        actor?.role ?? "system",
      );

      if (transitionError) {
        await connection.rollback();
        throw new ApiRouteError({
          code: "conflict",
          status: 409,
          message: transitionError,
        });
      }

      await connection.execute<ResultSetHeader>(
        `
          UPDATE bookings
          SET status = ?, status_updated_at = UTC_TIMESTAMP()
          WHERE id = ?
        `,
        [status, bookingId],
      );

      if (!isBookingBlockingStatus(status)) {
        await releaseSlotLocks(connection, bookingId);
      }

      await createBookingEvent(connection, {
        bookingId,
        businessId: existing.business_id,
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "system",
        eventType: "status_changed",
        previousStatus: existing.status,
        nextStatus: status,
        reason: actor?.reason ?? null,
      });
    }

    await connection.commit();
    return await findBookingById(bookingId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function requestBookingReschedule(
  bookingId: string,
  actor?: {
    userId?: string | null;
    role: "customer" | "shop" | "admin" | "system" | "public";
  },
) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<BookingRow[]>(
      `
        SELECT *
        FROM bookings
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [bookingId],
    );

    const existing = rows[0];

    if (!existing) {
      await connection.rollback();
      return null;
    }

    if (!canRequestReschedule(mapRowToBooking(existing))) {
      await connection.rollback();
      throw new ApiRouteError({
        code: "conflict",
        status: 409,
        message: "This booking can no longer request a reschedule.",
      });
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE bookings
        SET reschedule_requested_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [bookingId],
    );

    await createBookingEvent(connection, {
      bookingId,
      businessId: existing.business_id,
      actorUserId: actor?.userId ?? null,
      actorRole: actor?.role ?? "public",
      eventType: "reschedule_requested",
      previousStatus: existing.status,
      nextStatus: existing.status,
    });

    await connection.commit();
    return await findBookingById(bookingId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkSlotAvailability(input: {
  businessId: string;
  startAt: string;
  endAt: string;
}) {
  const pool = getDbPool();
  await expireOldBookings();
  const [bookings] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE business_id = ?
        AND status IN ('pending', 'confirmed')
        AND start_at < ?
        AND end_at > ?
    `,
    [
      input.businessId,
      toDatabaseDateTime(input.endAt),
      toDatabaseDateTime(input.startAt),
    ],
  );

  const [blocked] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM availability_exceptions
      WHERE business_id = ?
        AND start_at < ?
        AND end_at > ?
    `,
    [
      input.businessId,
      toDatabaseDateTime(input.endAt),
      toDatabaseDateTime(input.startAt),
    ],
  );

  return bookings[0].count === 0 && blocked[0].count === 0;
}
