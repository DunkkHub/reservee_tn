import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addDays, addHours, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import mysql from "mysql2/promise";

import { loadEnvFiles } from "./lib/load-env.mjs";
import { getDatabaseConfigFromEnv } from "./lib/mysql-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const DEFAULT_TIMEZONE = "Africa/Tunis";
const KEY_LENGTH = 64;
const SLOT_LOCK_STEP_MINUTES = 5;

await loadEnvFiles(projectRoot);
await import("./db-migrate.mjs");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

function toDbDateTime(value) {
  return formatInTimeZone(value, "UTC", "yyyy-MM-dd HH:mm:ss");
}

function formatDateKey(value) {
  return formatInTimeZone(value, DEFAULT_TIMEZONE, "yyyy-MM-dd");
}

function createDateTime(dateKey, time) {
  return fromZonedTime(`${dateKey}T${time}:00`, DEFAULT_TIMEZONE);
}

function getBookingExpiryAt(createdAt, startAt) {
  const createdExpiry = addHours(createdAt, 2);
  return createdExpiry < startAt ? createdExpiry : startAt;
}

function createSlotLocks(startAt, endAt) {
  const slots = [];
  let cursor = new Date(startAt);

  while (cursor < endAt) {
    slots.push(new Date(cursor));
    cursor = addMinutes(cursor, SLOT_LOCK_STEP_MINUTES);
  }

  return slots;
}

function resolveSeedPassword(envKey) {
  const configuredValue = process.env[envKey]?.trim();

  if (configuredValue) {
    return configuredValue;
  }

  return `Rv${randomBytes(10).toString("hex")}!A1`;
}

const adminPassword = resolveSeedPassword("SEED_ADMIN_PASSWORD");
const ownerPassword = resolveSeedPassword("SEED_OWNER_PASSWORD");
const customerPassword = resolveSeedPassword("SEED_CUSTOMER_PASSWORD");

const seedUsers = [
  {
    id: "seed-user-admin",
    role: "admin",
    name: "Reservee Admin",
    email: "admin@reservee.tn",
    phone: "+216 20 000 001",
    passwordHash: hashPassword(adminPassword),
  },
  {
    id: "seed-user-atlas",
    role: "shop",
    name: "Atlas Owner",
    email: "atlas@reservee.tn",
    phone: "+216 20 111 111",
    passwordHash: hashPassword(ownerPassword),
  },
  {
    id: "seed-user-nude",
    role: "shop",
    name: "Nude Owner",
    email: "nude@reservee.tn",
    phone: "+216 20 222 222",
    passwordHash: hashPassword(ownerPassword),
  },
  {
    id: "seed-user-hammam",
    role: "shop",
    name: "Hayat Owner",
    email: "hayat@reservee.tn",
    phone: "+216 20 333 333",
    passwordHash: hashPassword(ownerPassword),
  },
  {
    id: "seed-user-customer",
    role: "customer",
    name: "Salma Ben Youssef",
    email: "customer@reservee.tn",
    phone: "+216 21 555 777",
    passwordHash: hashPassword(customerPassword),
  },
];

const seedBusinesses = [
  {
    id: "seed-biz-atlas",
    ownerId: "seed-user-atlas",
    name: "Atlas Barber Club",
    slug: "atlas-barber-club",
    category: "barbers",
    city: "tunis",
    area: "Lac 2",
    address: "Rue du Lac, Lac 2, Tunis",
    phone: "+216 20 111 111",
    whatsapp: "+216 20 111 111",
    instagram: "@atlasbarberclub",
    tagline: "Precision cuts, beard work, and a polished barbershop atmosphere.",
    description:
      "Atlas Barber Club is a premium Tunis barbershop focused on fades, beard care, and clean appointment flow. Clients book quickly, businesses stay organised, and the profile feels like a real storefront instead of a listing stub.",
    logoText: "AB",
    coverUrl:
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1600&q=80",
    status: "featured",
    featuredRank: 1,
    featuredCopy: "Premium barber partner in Tunis.",
    audience: "men",
    bookingMode: "instant",
    operatingMode: "appointment_only",
    responseWindow: "Reponse sous 30 min",
    yearsInBusiness: 6,
    featuredCitySlug: "tunis",
    featuredCategorySlug: "barbers",
  },
  {
    id: "seed-biz-nude",
    ownerId: "seed-user-nude",
    name: "Nude Glow Studio",
    slug: "nude-glow-studio",
    category: "beauty-centers",
    city: "sousse",
    area: "Khzema",
    address: "Avenue de Khzema, Sousse",
    phone: "+216 20 222 222",
    whatsapp: "+216 20 222 222",
    instagram: "@nudeglowstudio",
    tagline: "Facials, glow rituals, and premium beauty care.",
    description:
      "Nude Glow Studio gives skincare and beauty clients a calm, polished booking experience. Services, prices, and availability are clearly structured so clients can move from discovery to confirmed appointment quickly.",
    logoText: "NG",
    coverUrl:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80",
    status: "approved",
    featuredRank: null,
    featuredCopy: null,
    audience: "women",
    bookingMode: "approval_required",
    operatingMode: "both",
    responseWindow: "Reponse sous 1 heure",
    yearsInBusiness: 4,
    featuredCitySlug: null,
    featuredCategorySlug: null,
  },
  {
    id: "seed-biz-hammam",
    ownerId: "seed-user-hammam",
    name: "Hayat Hammam & Spa",
    slug: "hayat-hammam-spa",
    category: "spas",
    city: "sfax",
    area: "Centre Ville",
    address: "Centre Ville, Sfax",
    phone: "+216 20 333 333",
    whatsapp: "+216 20 333 333",
    instagram: "@hayathammamspa",
    tagline: "Traditional hammam, massage, and slow wellness appointments.",
    description:
      "Hayat Hammam & Spa combines traditional care with a modern booking layer. The profile highlights real services, prices, and available times so clients can trust what they see before they commit.",
    logoText: "HH",
    coverUrl:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80",
    status: "approved",
    featuredRank: null,
    featuredCopy: null,
    audience: "unisex",
    bookingMode: "approval_required",
    operatingMode: "both",
    responseWindow: "Reponse sous 2 heures",
    yearsInBusiness: 9,
    featuredCitySlug: null,
    featuredCategorySlug: null,
  },
];

const services = [
  ["seed-svc-atlas-1", "seed-biz-atlas", "Fade Signature", "Fade net et finition premium.", 35, 45, "men", true, 0],
  ["seed-svc-atlas-2", "seed-biz-atlas", "Beard Sculpt", "Taille barbe, contours et soin.", 28, 30, "men", false, 1],
  ["seed-svc-atlas-3", "seed-biz-atlas", "Cut + Beard", "Pack coupe + barbe.", 55, 60, "men", true, 2],
  ["seed-svc-nude-1", "seed-biz-nude", "Glow Facial", "Soin eclat visage et hydratation.", 85, 60, "women", true, 0],
  ["seed-svc-nude-2", "seed-biz-nude", "Soft Makeup", "Mise en beaute naturelle.", 70, 50, "women", false, 1],
  ["seed-svc-nude-3", "seed-biz-nude", "Brow Styling", "Structuration sourcils.", 30, 25, "women", false, 2],
  ["seed-svc-hammam-1", "seed-biz-hammam", "Traditional Hammam", "Rituel hammam et gommage.", 60, 60, "unisex", true, 0],
  ["seed-svc-hammam-2", "seed-biz-hammam", "Relax Massage", "Massage relaxant corps complet.", 95, 75, "unisex", true, 1],
  ["seed-svc-hammam-3", "seed-biz-hammam", "Hammam + Massage", "Experience complete bien-etre.", 140, 120, "unisex", false, 2],
];

const mediaItems = [
  ["seed-media-atlas-cover", "seed-biz-atlas", "cover", "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1600&q=80", "Atlas Barber Club interior", 0],
  ["seed-media-atlas-1", "seed-biz-atlas", "gallery", "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=80", "Barber tools close-up", 1],
  ["seed-media-atlas-2", "seed-biz-atlas", "gallery", "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80", "Clean fade detail", 2],
  ["seed-media-nude-cover", "seed-biz-nude", "cover", "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80", "Beauty studio hero", 0],
  ["seed-media-nude-1", "seed-biz-nude", "gallery", "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=900&q=80", "Facial treatment room", 1],
  ["seed-media-nude-2", "seed-biz-nude", "gallery", "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80", "Beauty close-up", 2],
  ["seed-media-hammam-cover", "seed-biz-hammam", "cover", "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80", "Spa atmosphere", 0],
  ["seed-media-hammam-1", "seed-biz-hammam", "gallery", "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=900&q=80", "Massage setup", 1],
  ["seed-media-hammam-2", "seed-biz-hammam", "gallery", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80", "Spa details", 2],
];

const tomorrowKey = formatDateKey(addDays(new Date(), 1));
const dayAfterKey = formatDateKey(addDays(new Date(), 2));

const seedBookings = [
  {
    id: "seed-booking-atlas-confirmed",
    referenceCode: "ATLAS1001",
    businessId: "seed-biz-atlas",
    serviceId: "seed-svc-atlas-1",
    customerUserId: "seed-user-customer",
    customerName: "Salma Ben Youssef",
    customerPhone: "+216 21 555 777",
    customerNote: "Please keep the beard natural.",
    startAt: createDateTime(tomorrowKey, "10:00"),
    status: "confirmed",
    source: "web",
  },
  {
    id: "seed-booking-atlas-pending",
    referenceCode: "ATLAS1002",
    businessId: "seed-biz-atlas",
    serviceId: "seed-svc-atlas-3",
    customerUserId: null,
    customerName: "Public Client",
    customerPhone: "+216 20 444 888",
    customerNote: "First visit.",
    startAt: createDateTime(tomorrowKey, "13:00"),
    status: "pending",
    source: "web",
  },
  {
    id: "seed-booking-nude-confirmed",
    referenceCode: "NUDE1001",
    businessId: "seed-biz-nude",
    serviceId: "seed-svc-nude-1",
    customerUserId: null,
    customerName: "Amina Trabelsi",
    customerPhone: "+216 24 900 111",
    customerNote: "",
    startAt: createDateTime(dayAfterKey, "15:00"),
    status: "confirmed",
    source: "web",
  },
];

const connection = await mysql.createConnection({
  ...getDatabaseConfigFromEnv(),
  multipleStatements: true,
});

const businessIds = seedBusinesses.map((business) => business.id);
const userIds = seedUsers.map((user) => user.id);
const userEmails = seedUsers.map((user) => user.email.toLowerCase());
const userPhones = seedUsers.map((user) => user.phone.replace(/\D/g, ""));
const businessSlugs = seedBusinesses.map((business) => business.slug);
const bookingReferences = seedBookings.map((booking) => booking.referenceCode);

try {
  const [existingUsers] = await connection.query(
    `
      SELECT id
      FROM app_users
      WHERE id IN (${userIds.map(() => "?").join(", ")})
         OR email IN (${userEmails.map(() => "?").join(", ")})
         OR phone_normalized IN (${userPhones.map(() => "?").join(", ")})
    `,
    [...userIds, ...userEmails, ...userPhones],
  );
  const cleanupUserIds = [...new Set([...userIds, ...existingUsers.map((user) => user.id)])];

  await connection.beginTransaction();

  await connection.execute(
    `DELETE FROM sessions WHERE user_id IN (${cleanupUserIds.map(() => "?").join(", ")})`,
    cleanupUserIds,
  );
  await connection.execute(
    `DELETE FROM auth_challenges WHERE user_id IN (${cleanupUserIds.map(() => "?").join(", ")})`,
    cleanupUserIds,
  );
  await connection.execute(
    `DELETE FROM booking_access_sessions WHERE reference_code IN (${bookingReferences.map(() => "?").join(", ")})`,
    bookingReferences,
  );
  await connection.execute(
    `
      DELETE FROM business_profiles
      WHERE id IN (${businessIds.map(() => "?").join(", ")})
         OR slug IN (${businessSlugs.map(() => "?").join(", ")})
         OR owner_user_id IN (${cleanupUserIds.map(() => "?").join(", ")})
    `,
    [...businessIds, ...businessSlugs, ...cleanupUserIds],
  );
  await connection.execute(
    `DELETE FROM app_users WHERE id IN (${cleanupUserIds.map(() => "?").join(", ")})`,
    cleanupUserIds,
  );

  for (const user of seedUsers) {
    await connection.execute(
      `
        INSERT INTO app_users (
          id,
          role,
          name,
          email,
          phone,
          phone_normalized,
          password_hash,
          password_updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        user.id,
        user.role,
        user.name,
        user.email.toLowerCase(),
        user.phone,
        user.phone.replace(/\D/g, ""),
        user.passwordHash,
      ],
    );
  }

  for (const business of seedBusinesses) {
    await connection.execute(
      `
        INSERT INTO business_profiles (
          id,
          owner_user_id,
          business_name,
          category_slug,
          city_slug,
          area,
          address,
          phone,
          whatsapp,
          instagram,
          tagline,
          description,
          logo_text,
          cover_url,
          slug,
          timezone,
          audience,
          years_in_business,
          booking_mode,
          operating_mode,
          response_window,
          phone_verified,
          address_verified,
          response_time_tracked,
          cancellation_notice,
          late_arrival_grace_minutes,
          no_show_rule,
          hygiene_note,
          deposit_required,
          children_accepted,
          policy_clarity,
          featured_until,
          featured_rank,
          featured_city_slug,
          featured_category_slug,
          featured_copy,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, TRUE, ?, 10, ?, ?, FALSE, TRUE, 'clear', ?, ?, ?, ?, ?, ?)
      `,
      [
        business.id,
        business.ownerId,
        business.name,
        business.category,
        business.city,
        business.area,
        business.address,
        business.phone,
        business.whatsapp,
        business.instagram,
        business.tagline,
        business.description,
        business.logoText,
        business.coverUrl,
        business.slug,
        DEFAULT_TIMEZONE,
        business.audience,
        business.yearsInBusiness,
        business.bookingMode,
        business.operatingMode,
        business.responseWindow,
        "Merci d'annuler au moins 24h a l'avance.",
        "Les absences non annoncees peuvent limiter la priorite sur les prochains creneaux.",
        "Materiel desinfecte et poste prepare entre chaque client.",
        business.status === "featured"
          ? toDbDateTime(addDays(new Date(), 30))
          : null,
        business.featuredRank,
        business.featuredCitySlug,
        business.featuredCategorySlug,
        business.featuredCopy,
        business.status,
      ],
    );
  }

  for (const [id, businessId, title, description, price, duration, genderTarget, featured, sortOrder] of services) {
    await connection.execute(
      `
        INSERT INTO services (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
      `,
      [id, businessId, title, description, price, duration, featured ? 1 : 0, genderTarget, sortOrder],
    );
  }

  for (const business of seedBusinesses) {
    for (let day = 0; day < 7; day += 1) {
      const isClosed = day === 0;
      const breaks = day === 5 ? JSON.stringify([{ start: "13:00", end: "14:00" }]) : null;

      await connection.execute(
        `
          INSERT INTO business_hours (
            id,
            business_id,
            day_of_week,
            open_time,
            close_time,
            is_closed,
            breaks
          )
          VALUES (?, ?, ?, '09:00', '19:00', ?, ?)
        `,
        [`${business.id}-hours-${day}`, business.id, day, isClosed ? 1 : 0, breaks],
      );
    }
  }

  for (const [id, businessId, type, url, alt, sortOrder] of mediaItems) {
    await connection.execute(
      `
        INSERT INTO media_items (id, business_id, type, url, alt, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, businessId, type, url, alt, sortOrder],
    );
  }

  for (const booking of seedBookings) {
    const service = services.find((service) => service[0] === booking.serviceId);
    const durationMinutes = Number(service?.[5] ?? 45);
    const endAt = addMinutes(booking.startAt, durationMinutes);
    const createdAt = addHours(booking.startAt, -20);
    const expiresAt =
      booking.status === "pending"
        ? getBookingExpiryAt(createdAt, booking.startAt)
        : null;

    await connection.execute(
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
          status_updated_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        booking.id,
        booking.referenceCode,
        booking.businessId,
        booking.serviceId,
        booking.customerUserId,
        booking.customerName,
        booking.customerPhone,
        booking.customerPhone.replace(/\D/g, ""),
        booking.customerNote || null,
        toDbDateTime(booking.startAt),
        toDbDateTime(endAt),
        booking.status,
        booking.source,
        expiresAt ? toDbDateTime(expiresAt) : null,
        toDbDateTime(createdAt),
        toDbDateTime(createdAt),
        toDbDateTime(createdAt),
      ],
    );

    if (booking.status === "pending" || booking.status === "confirmed") {
      for (const slotStart of createSlotLocks(booking.startAt, endAt)) {
        await connection.execute(
          `
            INSERT INTO booking_slot_locks (id, booking_id, business_id, slot_start_at)
            VALUES (UUID(), ?, ?, ?)
          `,
          [booking.id, booking.businessId, toDbDateTime(slotStart)],
        );
      }
    }

    await connection.execute(
      `
        INSERT INTO booking_events (
          id,
          booking_id,
          business_id,
          actor_user_id,
          actor_role,
          event_type,
          next_status,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, 'created', ?, JSON_OBJECT('source', ?))
      `,
      [
        `${booking.id}-event-created`,
        booking.id,
        booking.businessId,
        booking.customerUserId,
        booking.customerUserId ? "customer" : "public",
        booking.status,
        booking.source,
      ],
    );

    await connection.execute(
      `
        INSERT INTO activity_logs (id, type, business_id, booking_id, actor_user_id, summary)
        VALUES (?, 'booking_created', ?, ?, ?, ?)
      `,
      [
        `${booking.id}-activity-created`,
        booking.businessId,
        booking.id,
        booking.customerUserId,
        `Booking ${booking.referenceCode} seeded with ${booking.status} status.`,
      ],
    );
  }

  for (const business of seedBusinesses) {
    await connection.execute(
      `
        INSERT INTO moderation_history (
          id,
          business_id,
          actor_user_id,
          status,
          internal_note,
          business_message,
          changed_at
        )
        VALUES (?, ?, 'seed-user-admin', ?, ?, ?, ?)
      `,
      [
        `${business.id}-moderation-1`,
        business.id,
        business.status,
        business.status === "featured"
          ? "Profile approved and featured for local development."
          : "Profile approved for local development.",
        business.status === "featured"
          ? "Votre fiche est mise en avant en local."
          : "Votre fiche est visible en local.",
        toDbDateTime(addHours(new Date(), -4)),
      ],
    );

    await connection.execute(
      `
        INSERT INTO activity_logs (id, type, business_id, actor_user_id, summary)
        VALUES (?, ?, ?, 'seed-user-admin', ?)
      `,
      [
        `${business.id}-activity-launch`,
        business.status === "featured" ? "business_featured" : "business_status_changed",
        business.id,
        business.status === "featured"
          ? `${business.name} is seeded as a featured marketplace partner.`
          : `${business.name} is seeded as a live marketplace business.`,
      ],
    );
  }

  await connection.commit();
  console.log("Development database seeded.");
  console.log("");
  console.log("Local development accounts");
  console.log(`Admin: admin@reservee.tn / ${adminPassword}`);
  console.log(`Business owner: atlas@reservee.tn / ${ownerPassword}`);
  console.log(`Customer: customer@reservee.tn / ${customerPassword}`);
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
