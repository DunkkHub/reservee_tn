import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db";
import type { Business, BusinessStatus, BusinessPolicy, BusinessTrust, BusinessMetrics, OperatingMode, BookingMode } from "@/lib/types";

type BusinessRow = RowDataPacket & {
  id: string;
  owner_user_id: string;
  business_name: string;
  category_slug: string;
  city_slug: string;
  area: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  tagline: string;
  description: string;
  logo_text: string;
  cover_url: string;
  slug: string;
  audience: string;
  years_in_business: number;
  booking_mode: BookingMode;
  operating_mode: OperatingMode;
  response_window: string;
  featured_until: string | null;
  featured_rank: number | null;
  featured_city_slug: string | null;
  featured_category_slug: string | null;
  featured_copy: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
};

const defaultTrust: BusinessTrust = {
  phoneVerified: false,
  addressVerified: false,
  adminApproved: false,
  responseTimeTracked: false,
  policyClarityBadge: false,
};

const defaultPolicies: BusinessPolicy = {
  cancellationNotice: "",
  lateArrivalGraceMinutes: 10,
  noShowRule: "Deux absences non annulees peuvent limiter la priorite sur les prochains creneaux.",
  depositRequired: false,
  childrenAccepted: true,
  policyClarity: "needs_review",
};

const defaultMetrics: BusinessMetrics = {
  profileViews: 0,
  bookingsThisWeek: 0,
  missedBookings: 0,
  busyDays: [],
  mostBookedServiceId: "",
};

export async function findBusinessById(id: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    "SELECT * FROM business_profiles WHERE id = ? LIMIT 1",
    [id],
  );

  if (!rows[0]) return null;

  return mapRowToBusiness(rows[0]);
}

export async function findBusinessBySlug(slug: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    "SELECT * FROM business_profiles WHERE slug = ? LIMIT 1",
    [slug],
  );

  if (!rows[0]) return null;

  return mapRowToBusiness(rows[0]);
}

export async function findBusinessByOwner(ownerUserId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    "SELECT * FROM business_profiles WHERE owner_user_id = ? LIMIT 1",
    [ownerUserId],
  );

  if (!rows[0]) return null;

  return mapRowToBusiness(rows[0]);
}

export async function findFeaturedBusinesses() {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    `
      SELECT * FROM business_profiles
      WHERE status = 'featured'
        AND (featured_until IS NULL OR featured_until > NOW())
      ORDER BY featured_rank ASC, created_at DESC
    `,
  );

  return rows.map(mapRowToBusiness);
}

export async function findBusinessesByCity(citySlug: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    `
      SELECT * FROM business_profiles
      WHERE city_slug = ? AND status IN ('approved', 'featured')
      ORDER BY created_at DESC
    `,
    [citySlug],
  );

  return rows.map(mapRowToBusiness);
}

export async function findBusinessesByCategory(categorySlug: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<BusinessRow[]>(
    `
      SELECT * FROM business_profiles
      WHERE category_slug = ? AND status IN ('approved', 'featured')
      ORDER BY created_at DESC
    `,
    [categorySlug],
  );

  return rows.map(mapRowToBusiness);
}

export async function updateBusinessProfile(
  businessId: string,
  updates: Partial<{
    business_name: string;
    address: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    tagline: string;
    description: string;
    logo_text: string;
    cover_url: string;
    audience: string;
    years_in_business: number;
    response_window: string;
  }>,
) {
  const pool = getDbPool();

  const updateFields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];

  if (updates.business_name !== undefined) {
    updateFields.push("business_name = ?");
    values.push(updates.business_name);
  }
  if (updates.address !== undefined) {
    updateFields.push("address = ?");
    values.push(updates.address);
  }
  if (updates.phone !== undefined) {
    updateFields.push("phone = ?");
    values.push(updates.phone);
  }
  if (updates.whatsapp !== undefined) {
    updateFields.push("whatsapp = ?");
    values.push(updates.whatsapp);
  }
  if (updates.instagram !== undefined) {
    updateFields.push("instagram = ?");
    values.push(updates.instagram);
  }
  if (updates.tagline !== undefined) {
    updateFields.push("tagline = ?");
    values.push(updates.tagline);
  }
  if (updates.description !== undefined) {
    updateFields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.logo_text !== undefined) {
    updateFields.push("logo_text = ?");
    values.push(updates.logo_text);
  }
  if (updates.cover_url !== undefined) {
    updateFields.push("cover_url = ?");
    values.push(updates.cover_url);
  }
  if (updates.audience !== undefined) {
    updateFields.push("audience = ?");
    values.push(updates.audience);
  }
  if (updates.years_in_business !== undefined) {
    updateFields.push("years_in_business = ?");
    values.push(updates.years_in_business);
  }
  if (updates.response_window !== undefined) {
    updateFields.push("response_window = ?");
    values.push(updates.response_window);
  }

  if (updateFields.length === 1) {
    // Only updated_at was added
    return await findBusinessById(businessId);
  }

  values.push(businessId);

  await pool.execute<ResultSetHeader>(
    `UPDATE business_profiles SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
  );

  return await findBusinessById(businessId);
}

export async function moderateBusiness(
  businessId: string,
  updates: {
    status: BusinessStatus;
    featured_until?: string | null;
    featured_rank?: number | null;
  },
) {
  const pool = getDbPool();

  const updateFields = ["status = ?", "updated_at = NOW()"];
  const values: unknown[] = [updates.status];

  if (updates.featured_until !== undefined) {
    updateFields.push("featured_until = ?");
    values.push(updates.featured_until);
  }
  if (updates.featured_rank !== undefined) {
    updateFields.push("featured_rank = ?");
    values.push(updates.featured_rank);
  }

  values.push(businessId);

  await pool.execute<ResultSetHeader>(
    `UPDATE business_profiles SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
  );

  return await findBusinessById(businessId);
}

function mapRowToBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_user_id,
    name: row.business_name,
    slug: row.slug,
    categoryId: `cat-${row.category_slug}`,
    cityId: `city-${row.city_slug}`,
    area: row.area,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    tagline: row.tagline,
    description: row.description,
    logoText: row.logo_text,
    coverUrl: row.cover_url,
    status: row.status,
    audience: row.audience as any,
    yearsInBusiness: row.years_in_business,
    bookingMode: row.booking_mode,
    operatingMode: row.operating_mode,
    responseWindow: row.response_window,
    featuredUntil: row.featured_until,
    featuredRank: row.featured_rank,
    featuredCitySlug: row.featured_city_slug,
    featuredCategorySlug: row.featured_category_slug as any,
    profileCompletion: 0, // Will be calculated separately
    services: [],
    hours: [],
    blockedSlots: [],
    media: [],
    policies: defaultPolicies,
    trust: defaultTrust,
    moderationHistory: [],
    metrics: defaultMetrics,
    createdAt: row.created_at,
  };
}
