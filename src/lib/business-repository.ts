import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { addDays, endOfWeek, startOfDay, startOfWeek } from "date-fns";

import { findNextAvailableSlot, generateAvailableSlots } from "@/lib/availability";
import { ensureBusinessHoursExist } from "@/lib/business-hours-repository";
import { getDbPool } from "@/lib/db";
import { fromDatabaseDateTime, toDatabaseDateTime } from "@/lib/datetime";
import { normalizeBusiness } from "@/lib/platform-rules";
import type {
  ActivityType,
  Audience,
  Booking,
  BookingMode,
  BookingStatus,
  Business,
  BusinessMetrics,
  BusinessPolicy,
  BusinessStatus,
  BusinessTrust,
  CategorySlug,
  MediaType,
  OperatingMode,
} from "@/lib/types";
import { calculateProfileCompletion } from "@/lib/utils";

type BusinessRow = RowDataPacket & {
  id: string;
  owner_user_id: string;
  business_name: string;
  category_slug: CategorySlug;
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
  timezone: string;
  audience: Audience;
  years_in_business: number;
  booking_mode: BookingMode;
  operating_mode: OperatingMode;
  response_window: string;
  phone_verified: boolean | number;
  address_verified: boolean | number;
  response_time_tracked: boolean | number;
  cancellation_notice: string;
  late_arrival_grace_minutes: number;
  no_show_rule: string;
  hygiene_note: string | null;
  deposit_required: boolean | number;
  children_accepted: boolean | number;
  policy_clarity: BusinessPolicy["policyClarity"];
  profile_views: number;
  featured_until: string | null;
  featured_rank: number | null;
  featured_city_slug: string | null;
  featured_category_slug: CategorySlug | null;
  featured_copy: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
};

type ServiceRow = RowDataPacket & {
  id: string;
  business_id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean | number;
  featured: boolean | number;
  gender_target: Business["services"][number]["genderTarget"];
  sort_order: number;
};

type BusinessHoursRow = RowDataPacket & {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean | number;
  breaks: string | null;
};

type BlockedSlotRow = RowDataPacket & {
  id: string;
  business_id: string;
  start_at: string;
  end_at: string;
  reason: string;
};

type MediaRow = RowDataPacket & {
  id: string;
  business_id: string;
  type: MediaType;
  url: string;
  alt: string;
  sort_order: number;
};

type ModerationRow = RowDataPacket & {
  id: string;
  business_id: string;
  status: BusinessStatus;
  internal_note: string;
  business_message: string;
  changed_at: string;
};

type BookingAggregateRow = RowDataPacket & {
  id: string;
  business_id: string;
  service_id: string;
  status: BookingStatus;
  start_at: string;
  end_at: string;
  created_at: string;
};

type BusinessCountRow = RowDataPacket & {
  business_id: string;
  count: number;
};

type BusinessMostBookedServiceRow = RowDataPacket & {
  business_id: string;
  service_id: string;
  count: number;
};

type BusinessBusyDayRow = RowDataPacket & {
  business_id: string;
  day_of_week: number;
  count: number;
};

type BusinessQueryOptions = {
  ids?: string[];
  slug?: string;
  ownerUserId?: string;
  citySlug?: string;
  categorySlug?: string;
  statuses?: BusinessStatus[];
  limit?: number;
  offset?: number;
  sort?: "created_desc" | "public_listing";
};

type BusinessCountOptions = Omit<BusinessQueryOptions, "limit" | "offset" | "sort">;

const weekdayLabels = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

function toBool(value: boolean | number | null | undefined) {
  return value === true || value === 1;
}

function buildInClause(values: string[]) {
  return values.map(() => "?").join(", ");
}

function groupRowsByBusinessId<T extends { business_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((groups, row) => {
    groups[row.business_id] ??= [];
    groups[row.business_id].push(row);
    return groups;
  }, {});
}

function mapRowToBusinessTrust(row: BusinessRow): BusinessTrust {
  return {
    phoneVerified: toBool(row.phone_verified),
    addressVerified: toBool(row.address_verified),
    adminApproved: row.status === "approved" || row.status === "featured",
    responseTimeTracked: toBool(row.response_time_tracked),
    policyClarityBadge: row.policy_clarity === "clear",
  };
}

function mapRowToBusinessPolicy(row: BusinessRow): BusinessPolicy {
  return {
    cancellationNotice: row.cancellation_notice ?? "",
    lateArrivalGraceMinutes: row.late_arrival_grace_minutes ?? 10,
    noShowRule: row.no_show_rule ?? "",
    hygieneNote: row.hygiene_note ?? "",
    depositRequired: toBool(row.deposit_required),
    childrenAccepted: toBool(row.children_accepted),
    policyClarity: row.policy_clarity ?? "needs_review",
  };
}

function mapServiceRow(row: ServiceRow): Business["services"][number] {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    active: toBool(row.active),
    featured: toBool(row.featured),
    genderTarget: row.gender_target,
  };
}

function mapBusinessHoursRow(row: BusinessHoursRow): Business["hours"][number] {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: toBool(row.is_closed),
    breaks: row.breaks ? JSON.parse(row.breaks) : [],
  };
}

function mapBlockedSlotRow(row: BlockedSlotRow): Business["blockedSlots"][number] {
  return {
    id: row.id,
    businessId: row.business_id,
    startAt: fromDatabaseDateTime(row.start_at) ?? new Date(0).toISOString(),
    endAt: fromDatabaseDateTime(row.end_at) ?? new Date(0).toISOString(),
    reason: row.reason,
  };
}

function mapMediaRow(row: MediaRow): Business["media"][number] {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    url: row.url,
    alt: row.alt,
  };
}

function mapModerationRow(row: ModerationRow): Business["moderationHistory"][number] {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.status,
    internalNote: row.internal_note,
    businessMessage: row.business_message,
    changedAt: fromDatabaseDateTime(row.changed_at) ?? new Date(0).toISOString(),
  };
}

function mapBookingAggregateRow(row: BookingAggregateRow): Booking {
  return {
    id: row.id,
    referenceCode: "",
    businessId: row.business_id,
    serviceId: row.service_id,
    customerName: "",
    customerPhone: "",
    customerNote: undefined,
    status: row.status,
    startAt: fromDatabaseDateTime(row.start_at) ?? new Date(0).toISOString(),
    endAt: fromDatabaseDateTime(row.end_at) ?? new Date(0).toISOString(),
    source: "web",
    expiresAt: null,
    rescheduleRequestedAt: null,
    statusUpdatedAt: null,
    createdAt: fromDatabaseDateTime(row.created_at) ?? new Date(0).toISOString(),
  };
}

function buildMetrics(row: BusinessRow, metrics?: BusinessMetrics): BusinessMetrics {
  return {
    profileViews: row.profile_views ?? 0,
    bookingsThisWeek: metrics?.bookingsThisWeek ?? 0,
    missedBookings: metrics?.missedBookings ?? 0,
    busyDays: metrics?.busyDays ?? [],
    mostBookedServiceId: metrics?.mostBookedServiceId ?? "",
  };
}

function buildBusinessFromRow(
  row: BusinessRow,
  related: {
    services: Business["services"];
    hours: Business["hours"];
    blockedSlots: Business["blockedSlots"];
    media: Business["media"];
    moderationHistory: Business["moderationHistory"];
    bookingRows: ReturnType<typeof mapBookingAggregateRow>[];
    metrics?: BusinessMetrics;
  },
) {
  const draftBusiness = normalizeBusiness({
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
    featuredUntil: fromDatabaseDateTime(row.featured_until),
    featuredRank: row.featured_rank,
    featuredCitySlug:
      row.featured_city_slug ?? (row.status === "featured" ? row.city_slug : null),
    featuredCategorySlug:
      row.featured_category_slug ??
      (row.status === "featured" ? row.category_slug : null),
    timezone: row.timezone,
    audience: row.audience,
    yearsInBusiness: row.years_in_business,
    bookingMode: row.booking_mode,
    operatingMode: row.operating_mode,
    featuredCopy: row.featured_copy ?? undefined,
    responseWindow: row.response_window,
    trust: mapRowToBusinessTrust(row),
    policies: mapRowToBusinessPolicy(row),
    services: related.services,
    hours: related.hours,
    blockedSlots: related.blockedSlots,
    media: related.media,
    moderationHistory: related.moderationHistory,
    metrics: buildMetrics(row, related.metrics),
    createdAt: fromDatabaseDateTime(row.created_at) ?? new Date(0).toISOString(),
  });

  const firstActiveService = draftBusiness.services.find((service) => service.active);
  const nextAvailableDate = firstActiveService
    ? findNextAvailableSlot(draftBusiness, firstActiveService, related.bookingRows, 14)
    : null;
  const hasAvailabilityToday = firstActiveService
    ? generateAvailableSlots(draftBusiness, firstActiveService, related.bookingRows, new Date())
        .length > 0
    : false;

  const nextBusiness = {
    ...draftBusiness,
    nextAvailableAt: nextAvailableDate?.toISOString() ?? null,
    hasAvailabilityToday,
  };

  return {
    ...nextBusiness,
    profileCompletion: calculateProfileCompletion(nextBusiness),
  };
}

function buildBusinessWhere(options: BusinessCountOptions = {}) {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (options.ids?.length) {
    whereClauses.push(`id IN (${buildInClause(options.ids)})`);
    params.push(...options.ids);
  }

  if (options.slug) {
    whereClauses.push("slug = ?");
    params.push(options.slug);
  }

  if (options.ownerUserId) {
    whereClauses.push("owner_user_id = ?");
    params.push(options.ownerUserId);
  }

  if (options.citySlug) {
    whereClauses.push("city_slug = ?");
    params.push(options.citySlug);
  }

  if (options.categorySlug) {
    whereClauses.push("category_slug = ?");
    params.push(options.categorySlug);
  }

  if (options.statuses?.length) {
    whereClauses.push(`status IN (${buildInClause(options.statuses)})`);
    params.push(...options.statuses);
  }

  return {
    whereSql: whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "",
    params,
  };
}

function getBusinessOrderBy(sort: BusinessQueryOptions["sort"]) {
  if (sort === "public_listing") {
    return `
      ORDER BY
        CASE WHEN status = 'featured' THEN 0 ELSE 1 END ASC,
        COALESCE(featured_rank, 999999) ASC,
        created_at DESC
    `;
  }

  return " ORDER BY created_at DESC";
}

async function findBusinessRows(options: BusinessQueryOptions = {}) {
  const pool = getDbPool();
  const { whereSql, params } = buildBusinessWhere(options);
  let query = `SELECT * FROM business_profiles${whereSql}${getBusinessOrderBy(options.sort)}`;

  if (options.limit !== undefined) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  if (options.offset !== undefined) {
    query += " OFFSET ?";
    params.push(options.offset);
  }

  const [rows] = await pool.query<BusinessRow[]>(query, params);
  return rows;
}

export async function countBusinesses(options: BusinessCountOptions = {}) {
  const pool = getDbPool();
  const { whereSql, params } = buildBusinessWhere(options);
  const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count FROM business_profiles${whereSql}`,
    params,
  );

  return Number(rows[0]?.count ?? 0);
}

async function hydrateBusinesses(rows: BusinessRow[], ensureHours = false) {
  if (rows.length === 0) {
    return [];
  }

  const pool = getDbPool();
  const businessIds = rows.map((row) => row.id);
  const businessIdClause = buildInClause(businessIds);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const availabilityStart = startOfDay(now);
  const availabilityEnd = addDays(availabilityStart, 15);

  if (ensureHours) {
    await Promise.all(businessIds.map((businessId) => ensureBusinessHoursExist(businessId)));
  }

  const [
    serviceRows,
    hoursRows,
    blockedSlotRows,
    mediaRows,
    moderationRows,
    availabilityBookingRows,
    bookingsThisWeekRows,
    missedBookingRows,
    mostBookedServiceRows,
    busyDayRows,
  ] = await Promise.all([
    pool.query<ServiceRow[]>(
      `
        SELECT
          id,
          business_id,
          title,
          description,
          price,
          duration_minutes,
          active,
          featured,
          gender_target,
          sort_order
        FROM (
          SELECT
            id,
            business_id,
            title,
            description,
            price,
            duration_minutes,
            active,
            featured,
            gender_target,
            sort_order,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY business_id
              ORDER BY sort_order ASC, created_at ASC
            ) AS row_num
          FROM services
          WHERE business_id IN (${businessIdClause})
        ) ranked_services
        WHERE row_num <= 100
        ORDER BY business_id ASC, sort_order ASC, created_at ASC
      `,
      businessIds,
    ),
    pool.query<BusinessHoursRow[]>(
      `
        SELECT * FROM business_hours
        WHERE business_id IN (${businessIdClause})
        ORDER BY business_id ASC, day_of_week ASC
      `,
      businessIds,
    ),
    pool.query<BlockedSlotRow[]>(
      `
        SELECT id, business_id, start_at, end_at, reason
        FROM (
          SELECT
            id,
            business_id,
            start_at,
            end_at,
            reason,
            ROW_NUMBER() OVER (
              PARTITION BY business_id
              ORDER BY start_at ASC
            ) AS row_num
          FROM availability_exceptions
          WHERE business_id IN (${businessIdClause})
            AND exception_type = 'blocked'
            AND end_at >= ?
        ) ranked_blocked_slots
        WHERE row_num <= 100
        ORDER BY business_id ASC, start_at ASC
      `,
      [...businessIds, toDatabaseDateTime(availabilityStart)],
    ),
    pool.query<MediaRow[]>(
      `
        SELECT id, business_id, type, url, alt, sort_order
        FROM (
          SELECT
            id,
            business_id,
            type,
            url,
            alt,
            sort_order,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY business_id
              ORDER BY type ASC, sort_order ASC, created_at ASC
            ) AS row_num
          FROM media_items
          WHERE business_id IN (${businessIdClause})
        ) ranked_media
        WHERE row_num <= 50
        ORDER BY business_id ASC, type ASC, sort_order ASC, created_at ASC
      `,
      businessIds,
    ),
    pool.query<ModerationRow[]>(
      `
        SELECT id, business_id, status, internal_note, business_message, changed_at
        FROM (
          SELECT
            id,
            business_id,
            status,
            internal_note,
            business_message,
            changed_at,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY business_id
              ORDER BY changed_at DESC, created_at DESC
            ) AS row_num
          FROM moderation_history
          WHERE business_id IN (${businessIdClause})
        ) ranked_moderation
        WHERE row_num <= 20
        ORDER BY business_id ASC, changed_at DESC, created_at DESC
      `,
      businessIds,
    ),
    pool.query<BookingAggregateRow[]>(
      `
        SELECT id, business_id, service_id, status, start_at, end_at, created_at
        FROM bookings
        WHERE business_id IN (${businessIdClause})
          AND status IN ('pending', 'confirmed')
          AND start_at < ?
          AND end_at > ?
      `,
      [
        ...businessIds,
        toDatabaseDateTime(availabilityEnd),
        toDatabaseDateTime(availabilityStart),
      ],
    ),
    pool.query<BusinessCountRow[]>(
      `
        SELECT business_id, COUNT(*) AS count
        FROM bookings
        WHERE business_id IN (${businessIdClause})
          AND status IN ('pending', 'confirmed', 'completed', 'no_show')
          AND start_at >= ?
          AND start_at <= ?
        GROUP BY business_id
      `,
      [
        ...businessIds,
        toDatabaseDateTime(weekStart),
        toDatabaseDateTime(weekEnd),
      ],
    ),
    pool.query<BusinessCountRow[]>(
      `
        SELECT business_id, COUNT(*) AS count
        FROM bookings
        WHERE business_id IN (${businessIdClause})
          AND status = 'no_show'
        GROUP BY business_id
      `,
      businessIds,
    ),
    pool.query<BusinessMostBookedServiceRow[]>(
      `
        SELECT business_id, service_id, COUNT(*) AS count
        FROM bookings
        WHERE business_id IN (${businessIdClause})
          AND status IN ('confirmed', 'completed')
        GROUP BY business_id, service_id
        ORDER BY business_id ASC, count DESC
      `,
      businessIds,
    ),
    pool.query<BusinessBusyDayRow[]>(
      `
        SELECT business_id, DAYOFWEEK(start_at) - 1 AS day_of_week, COUNT(*) AS count
        FROM bookings
        WHERE business_id IN (${businessIdClause})
          AND status IN ('confirmed', 'completed')
        GROUP BY business_id, day_of_week
        ORDER BY business_id ASC, count DESC
      `,
      businessIds,
    ),
  ]);

  const servicesByBusinessId = groupRowsByBusinessId(serviceRows[0]);
  const hoursByBusinessId = groupRowsByBusinessId(hoursRows[0]);
  const blockedByBusinessId = groupRowsByBusinessId(blockedSlotRows[0]);
  const mediaByBusinessId = groupRowsByBusinessId(mediaRows[0]);
  const moderationByBusinessId = groupRowsByBusinessId(moderationRows[0]);
  const bookingsByBusinessId = groupRowsByBusinessId(availabilityBookingRows[0]);
  const busyDaysByBusinessId = groupRowsByBusinessId(busyDayRows[0]);
  const bookingsThisWeekByBusinessId = new Map(
    bookingsThisWeekRows[0].map((row) => [row.business_id, Number(row.count)]),
  );
  const missedBookingsByBusinessId = new Map(
    missedBookingRows[0].map((row) => [row.business_id, Number(row.count)]),
  );
  const mostBookedServiceByBusinessId = new Map<string, string>();

  for (const row of mostBookedServiceRows[0]) {
    if (!mostBookedServiceByBusinessId.has(row.business_id)) {
      mostBookedServiceByBusinessId.set(row.business_id, row.service_id);
    }
  }

  return rows.map((row) =>
    buildBusinessFromRow(row, {
      services: (servicesByBusinessId[row.id] ?? []).map(mapServiceRow),
      hours: (hoursByBusinessId[row.id] ?? []).map(mapBusinessHoursRow),
      blockedSlots: (blockedByBusinessId[row.id] ?? []).map(mapBlockedSlotRow),
      media: (mediaByBusinessId[row.id] ?? []).map(mapMediaRow),
      moderationHistory: (moderationByBusinessId[row.id] ?? []).map(mapModerationRow),
      bookingRows: (bookingsByBusinessId[row.id] ?? []).map(mapBookingAggregateRow),
      metrics: {
        profileViews: row.profile_views ?? 0,
        bookingsThisWeek: bookingsThisWeekByBusinessId.get(row.id) ?? 0,
        missedBookings: missedBookingsByBusinessId.get(row.id) ?? 0,
        busyDays: (busyDaysByBusinessId[row.id] ?? [])
          .sort((left, right) => Number(right.count) - Number(left.count))
          .slice(0, 3)
          .map((busyDay) => weekdayLabels[Number(busyDay.day_of_week)] ?? ""),
        mostBookedServiceId: mostBookedServiceByBusinessId.get(row.id) ?? "",
      },
    }),
  );
}

export async function findBusinesses(options: BusinessQueryOptions = {}) {
  const rows = await findBusinessRows(options);
  return await hydrateBusinesses(rows, Boolean(options.ownerUserId || options.ids?.length));
}

export async function findBusinessById(id: string) {
  return (await findBusinesses({ ids: [id], limit: 1 }))[0] ?? null;
}

export async function findBusinessBySlug(slug: string) {
  return (await findBusinesses({ slug, limit: 1 }))[0] ?? null;
}

export async function findBusinessByOwner(ownerUserId: string) {
  return (await findBusinesses({ ownerUserId, limit: 1 }))[0] ?? null;
}

export async function findFeaturedBusinesses() {
  return await findBusinesses({
    statuses: ["featured"],
    sort: "public_listing",
    limit: 100,
    offset: 0,
  });
}

export async function findBusinessesByCity(
  citySlug: string,
  options: Pick<BusinessQueryOptions, "limit" | "offset"> = {},
) {
  return await findBusinesses({
    citySlug,
    statuses: ["approved", "featured"],
    sort: "public_listing",
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });
}

export async function findBusinessesByCategory(
  categorySlug: string,
  options: Pick<BusinessQueryOptions, "limit" | "offset"> = {},
) {
  return await findBusinesses({
    categorySlug: categorySlug as CategorySlug,
    statuses: ["approved", "featured"],
    sort: "public_listing",
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });
}

export async function findPublicBusinesses(
  filters: Pick<
    BusinessQueryOptions,
    "citySlug" | "categorySlug" | "limit" | "offset"
  > = {},
) {
  return await findBusinesses({
    ...filters,
    statuses: ["approved", "featured"],
    sort: "public_listing",
    limit: filters.limit ?? 100,
    offset: filters.offset ?? 0,
  });
}

export async function countPublicBusinesses(
  filters: Pick<BusinessQueryOptions, "citySlug" | "categorySlug"> = {},
) {
  return await countBusinesses({
    ...filters,
    statuses: ["approved", "featured"],
  });
}

export async function updateBusinessProfile(
  businessId: string,
  updates: Partial<{
    business_name: string;
    area: string;
    address: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    tagline: string;
    description: string;
    logo_text: string;
    cover_url: string;
    audience: Audience;
    years_in_business: number;
    response_window: string;
    booking_mode: BookingMode;
    operating_mode: OperatingMode;
    status: BusinessStatus;
    phone_verified: boolean;
    address_verified: boolean;
    response_time_tracked: boolean;
    cancellation_notice: string;
    late_arrival_grace_minutes: number;
    no_show_rule: string;
    hygiene_note: string;
    deposit_required: boolean;
    children_accepted: boolean;
    policy_clarity: BusinessPolicy["policyClarity"];
  }>,
) {
  const pool = getDbPool();
  const updateFields: string[] = ["updated_at = NOW()"];
  const values: Array<string | number | boolean> = [];

  const fieldMap: Record<string, string> = {
    business_name: "business_name",
    area: "area",
    address: "address",
    phone: "phone",
    whatsapp: "whatsapp",
    instagram: "instagram",
    tagline: "tagline",
    description: "description",
    logo_text: "logo_text",
    cover_url: "cover_url",
    audience: "audience",
    years_in_business: "years_in_business",
    response_window: "response_window",
    booking_mode: "booking_mode",
    operating_mode: "operating_mode",
    status: "status",
    phone_verified: "phone_verified",
    address_verified: "address_verified",
    response_time_tracked: "response_time_tracked",
    cancellation_notice: "cancellation_notice",
    late_arrival_grace_minutes: "late_arrival_grace_minutes",
    no_show_rule: "no_show_rule",
    hygiene_note: "hygiene_note",
    deposit_required: "deposit_required",
    children_accepted: "children_accepted",
    policy_clarity: "policy_clarity",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    const value = updates[key as keyof typeof updates];

    if (value !== undefined) {
      updateFields.push(`${column} = ?`);
      values.push(value as string | number | boolean);
    }
  }

  if (updateFields.length === 1) {
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
    featured_city_slug?: string | null;
    featured_category_slug?: CategorySlug | null;
  },
) {
  const pool = getDbPool();
  const updateFields = ["status = ?", "updated_at = NOW()"];
  const values: Array<string | number | null> = [updates.status];

  if (updates.featured_until !== undefined) {
    updateFields.push("featured_until = ?");
    values.push(updates.featured_until);
  }

  if (updates.featured_rank !== undefined) {
    updateFields.push("featured_rank = ?");
    values.push(updates.featured_rank);
  }

  if (updates.featured_city_slug !== undefined) {
    updateFields.push("featured_city_slug = ?");
    values.push(updates.featured_city_slug);
  }

  if (updates.featured_category_slug !== undefined) {
    updateFields.push("featured_category_slug = ?");
    values.push(updates.featured_category_slug);
  }

  values.push(businessId);

  await pool.execute<ResultSetHeader>(
    `UPDATE business_profiles SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
  );

  return await findBusinessById(businessId);
}

export async function incrementBusinessProfileViews(businessId: string) {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `
      UPDATE business_profiles
      SET profile_views = profile_views + 1, updated_at = NOW()
      WHERE id = ?
    `,
    [businessId],
  );
}

export type { ActivityType };
