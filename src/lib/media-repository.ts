import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDbPool } from "@/lib/db";
import type { PaginationOptions } from "@/lib/pagination";
import type { MediaItem, MediaType } from "@/lib/types";

type MediaRow = RowDataPacket & {
  id: string;
  business_id: string;
  type: MediaType;
  url: string;
  alt: string;
  storage_provider: string | null;
  storage_key: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
};

type MediaListOptions = Partial<Pick<PaginationOptions, "limit" | "offset">>;

function normalizeMediaListOptions(options: MediaListOptions = {}) {
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

function mapRowToMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    url: row.url,
    alt: row.alt,
    storageProvider:
      (row.storage_provider as MediaItem["storageProvider"] | null) ?? undefined,
    storageKey: row.storage_key ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
  };
}

async function normalizeSortOrder(
  connection: Awaited<ReturnType<ReturnType<typeof getDbPool>["getConnection"]>>,
  businessId: string,
) {
  const [rows] = await connection.query<MediaRow[]>(
    `
      SELECT * FROM media_items
      WHERE business_id = ?
      ORDER BY type ASC, sort_order ASC, created_at ASC
    `,
    [businessId],
  );

  for (const [index, row] of rows.entries()) {
    await connection.execute<ResultSetHeader>(
      "UPDATE media_items SET sort_order = ? WHERE id = ?",
      [index, row.id],
    );
  }

  return rows;
}

export async function findMediaByBusiness(
  businessId: string,
  options: MediaListOptions = {},
) {
  const pool = getDbPool();
  const { limit, offset } = normalizeMediaListOptions(options);
  const [rows] = await pool.query<MediaRow[]>(
    `
      SELECT * FROM media_items
      WHERE business_id = ?
      ORDER BY type ASC, sort_order ASC, created_at ASC
      LIMIT ?
      OFFSET ?
    `,
    [businessId, limit, offset],
  );

  return rows.map(mapRowToMedia);
}

export async function countMediaByBusiness(businessId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM media_items WHERE business_id = ?",
    [businessId],
  );
  return Number(rows[0]?.count ?? 0);
}

async function findMediaItemByBusiness(businessId: string, mediaId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<MediaRow[]>(
    "SELECT * FROM media_items WHERE business_id = ? AND id = ? LIMIT 1",
    [businessId, mediaId],
  );
  return rows[0] ? mapRowToMedia(rows[0]) : null;
}

export async function createMediaItem(input: {
  businessId: string;
  type?: MediaType;
  url: string;
  alt: string;
  storageProvider?: string;
  storageKey?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}) {
  const pool = getDbPool();
  const connection = await pool.getConnection();
  const mediaId = randomUUID();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM media_items WHERE business_id = ?",
      [input.businessId],
    );
    const sortOrder = Number(existingRows[0]?.count ?? 0);
    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO media_items (
          id,
          business_id,
          type,
          url,
          alt,
          storage_provider,
          storage_key,
          mime_type,
          file_size_bytes,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        mediaId,
        input.businessId,
        input.type ?? "gallery",
        input.url.trim(),
        input.alt.trim(),
        input.storageProvider ?? "external_url",
        input.storageKey ?? null,
        input.mimeType ?? null,
        input.fileSizeBytes ?? null,
        sortOrder,
      ],
    );

    if ((input.type ?? "gallery") === "cover") {
      await connection.execute<ResultSetHeader>(
        "UPDATE business_profiles SET cover_url = ?, updated_at = NOW() WHERE id = ?",
        [input.url.trim(), input.businessId],
      );
      await connection.execute<ResultSetHeader>(
        `
          UPDATE media_items
          SET type = CASE WHEN id = ? THEN 'cover' ELSE 'gallery' END
          WHERE business_id = ?
        `,
        [mediaId, input.businessId],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return await findMediaItemByBusiness(input.businessId, mediaId);
}

export async function deleteMediaItem(businessId: string, mediaId: string) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<MediaRow[]>(
      "SELECT * FROM media_items WHERE business_id = ? AND id = ? LIMIT 1",
      [businessId, mediaId],
    );
    const current = rows[0];

    if (!current) {
      await connection.rollback();
      return false;
    }

    await connection.execute<ResultSetHeader>(
      "DELETE FROM media_items WHERE business_id = ? AND id = ?",
      [businessId, mediaId],
    );

    const normalizedRows = await normalizeSortOrder(connection, businessId);

    if (current.type === "cover") {
      const nextCover = normalizedRows.find((row) => row.type === "gallery");

      if (nextCover) {
        await connection.execute<ResultSetHeader>(
          `
            UPDATE media_items
            SET type = CASE WHEN id = ? THEN 'cover' ELSE 'gallery' END
            WHERE business_id = ?
          `,
          [nextCover.id, businessId],
        );
        await connection.execute<ResultSetHeader>(
          "UPDATE business_profiles SET cover_url = ?, updated_at = NOW() WHERE id = ?",
          [nextCover.url, businessId],
        );
      } else {
        await connection.execute<ResultSetHeader>(
          "UPDATE business_profiles SET cover_url = '', updated_at = NOW() WHERE id = ?",
          [businessId],
        );
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function reorderMediaItem(
  businessId: string,
  mediaId: string,
  direction: "up" | "down",
) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<MediaRow[]>(
      `
        SELECT * FROM media_items
        WHERE business_id = ? AND type = 'gallery'
        ORDER BY sort_order ASC, created_at ASC
      `,
      [businessId],
    );

    const index = rows.findIndex((row) => row.id === mediaId);

    if (index === -1) {
      await connection.rollback();
      return await findMediaByBusiness(businessId);
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= rows.length) {
      await connection.rollback();
      return await findMediaByBusiness(businessId);
    }

    const nextRows = [...rows];
    const [moved] = nextRows.splice(index, 1);
    nextRows.splice(targetIndex, 0, moved);

    for (const [position, row] of nextRows.entries()) {
      await connection.execute<ResultSetHeader>(
        "UPDATE media_items SET sort_order = ? WHERE id = ?",
        [position, row.id],
      );
    }

    await connection.commit();
    return await findMediaByBusiness(businessId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setCoverMediaItem(businessId: string, mediaId: string) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<MediaRow[]>(
      "SELECT * FROM media_items WHERE business_id = ? AND id = ? LIMIT 1",
      [businessId, mediaId],
    );
    const target = rows[0];

    if (!target) {
      await connection.rollback();
      return await findMediaByBusiness(businessId);
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE media_items
        SET type = CASE WHEN id = ? THEN 'cover' ELSE 'gallery' END
        WHERE business_id = ?
      `,
      [mediaId, businessId],
    );

    await connection.execute<ResultSetHeader>(
      "UPDATE business_profiles SET cover_url = ?, updated_at = NOW() WHERE id = ?",
      [target.url, businessId],
    );

    await connection.commit();
    return await findMediaByBusiness(businessId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
