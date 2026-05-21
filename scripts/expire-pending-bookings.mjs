import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

await loadEnvFiles(projectRoot);

const connection = await mysql.createConnection({
  ...getDatabaseConfigFromEnv(),
  multipleStatements: false,
});

try {
  await connection.beginTransaction();

  const [rows] = await connection.query(
    `
      SELECT id, business_id
      FROM bookings
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= UTC_TIMESTAMP()
      FOR UPDATE
    `,
  );

  let expiredCount = 0;

  for (const row of rows) {
    await connection.execute(
      `
        UPDATE bookings
        SET status = 'expired',
            status_updated_at = UTC_TIMESTAMP()
        WHERE id = ?
      `,
      [row.id],
    );

    await connection.execute(
      `
        DELETE FROM booking_slot_locks
        WHERE booking_id = ?
      `,
      [row.id],
    );

    await connection.execute(
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
        VALUES (?, ?, ?, NULL, 'system', 'status_changed', 'pending', 'expired', 'pending_expired', JSON_OBJECT('source', 'script'))
      `,
      [randomUUID(), row.id, row.business_id],
    );

    expiredCount += 1;
  }

  await connection.commit();
  console.log(`Expired ${expiredCount} pending booking(s).`);
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
