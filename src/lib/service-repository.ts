import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import type { Service } from "@/lib/types";

type ServiceRow = RowDataPacket & {
  id: string;
  business_id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  featured: boolean;
  gender_target: Service["genderTarget"];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapRowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    price: row.price,
    durationMinutes: row.duration_minutes,
    active: row.active,
    featured: row.featured,
    genderTarget: row.gender_target,
  };
}

export async function findServiceById(id: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<ServiceRow[]>(
    "SELECT * FROM services WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ? mapRowToService(rows[0]) : null;
}

export async function findServicesByBusiness(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<ServiceRow[]>(
    `
      SELECT * FROM services
      WHERE business_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `,
    [businessId],
  );
  return rows.map(mapRowToService);
}

export async function createService(input: {
  businessId: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  genderTarget: Service["genderTarget"];
}) {
  const pool = getDbPool();

  const serviceId = randomUUID();

  await pool.execute<ResultSetHeader>(
    `
      INSERT INTO services (
        id,
        business_id,
        title,
        description,
        price,
        duration_minutes,
        gender_target,
        active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
    `,
    [
      serviceId,
      input.businessId,
      input.title.trim(),
      input.description.trim(),
      input.price,
      input.durationMinutes,
      input.genderTarget,
    ],
  );

  return await findServiceById(serviceId);
}

export async function updateService(
  serviceId: string,
  updates: Partial<{
    title: string;
    description: string;
    price: number;
    durationMinutes: number;
    genderTarget: Service["genderTarget"];
    active: boolean;
    featured: boolean;
  }>,
) {
  const pool = getDbPool();

  const updateFields: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) {
    updateFields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.price !== undefined) {
    updateFields.push("price = ?");
    values.push(updates.price);
  }
  if (updates.durationMinutes !== undefined) {
    updateFields.push("duration_minutes = ?");
    values.push(updates.durationMinutes);
  }
  if (updates.genderTarget !== undefined) {
    updateFields.push("gender_target = ?");
    values.push(updates.genderTarget);
  }
  if (updates.active !== undefined) {
    updateFields.push("active = ?");
    values.push(updates.active ? true : false);
  }
  if (updates.featured !== undefined) {
    updateFields.push("featured = ?");
    values.push(updates.featured ? true : false);
  }

  if (updateFields.length === 0) {
    return await findServiceById(serviceId);
  }

  values.push(serviceId);

  await pool.execute<ResultSetHeader>(
    `UPDATE services SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
  );

  return await findServiceById(serviceId);
}

export async function toggleService(
  businessId: string,
  serviceId: string,
) {
  const service = await findServiceById(serviceId);

  if (!service || service.businessId !== businessId) {
    return null;
  }

  return await updateService(serviceId, { active: !service.active });
}

export async function deleteService(serviceId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    "DELETE FROM services WHERE id = ?",
    [serviceId],
  );
}
