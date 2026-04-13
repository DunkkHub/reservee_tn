import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "reservee_tn",
  multipleStatements: true,
});

const schemaFiles = [
  path.join(projectRoot, "database", "reservee_tn.sql"),
  path.join(projectRoot, "database", "migrations", "2026-04-13-sync-backend-schema.sql"),
  path.join(projectRoot, "database", "migrations", "2026-04-13-production-state-foundation.sql"),
];

for (const file of schemaFiles) {
  const sql = await fs.readFile(file, "utf8");
  await connection.query(sql);
}

const seedPasswordHash = "dev-seed-placeholder-hash";

const seedUsers = [
  {
    id: "seed-user-atlas",
    name: "Atlas Owner",
    email: "atlas@reservee.seed",
    phone: "+216 20 111 111",
  },
  {
    id: "seed-user-nude",
    name: "Nude Owner",
    email: "nude@reservee.seed",
    phone: "+216 20 222 222",
  },
  {
    id: "seed-user-hammam",
    name: "Hammam Owner",
    email: "hammam@reservee.seed",
    phone: "+216 20 333 333",
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
      "Atlas Barber Club is a premium Tunis barbershop focused on fades, beard care, and clean appointment flow. Clients book quickly, businesses stay organized, and the profile feels like a real storefront instead of a listing stub.",
    logoText: "AB",
    coverUrl:
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1600&q=80",
    audience: "men",
    years: 6,
    bookingMode: "instant",
    operatingMode: "appointment_only",
    responseWindow: "Reponse sous 30 min",
    phoneVerified: true,
    addressVerified: true,
    responseTimeTracked: true,
    cancellationNotice: "Merci d annuler au moins 24h a l avance.",
    lateArrivalGraceMinutes: 10,
    noShowRule: "Deux absences non annulees peuvent limiter les prochaines demandes.",
    hygieneNote: "Outils desinfectes entre chaque client.",
    depositRequired: false,
    childrenAccepted: true,
    policyClarity: "clear",
    status: "featured",
    featuredUntil: "2026-12-31 23:59:59",
    featuredRank: 1,
    featuredCitySlug: "tunis",
    featuredCategorySlug: "barbers",
    featuredCopy: "Premium barber partner in Tunis.",
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
      "Nude Glow Studio gives skincare and beauty clients a calm, polished booking experience. Services, prices, and availability are clearly structured so clients can move from discovery to confirmed appointment in under a minute.",
    logoText: "NG",
    coverUrl:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80",
    audience: "women",
    years: 4,
    bookingMode: "approval_required",
    operatingMode: "both",
    responseWindow: "Reponse sous 1 heure",
    phoneVerified: true,
    addressVerified: true,
    responseTimeTracked: true,
    cancellationNotice: "Annulation souhaitee 12h avant le rendez-vous.",
    lateArrivalGraceMinutes: 8,
    noShowRule: "Les absences non annoncees peuvent affecter les prochaines reservations.",
    hygieneNote: "Protocoles hygiene renforces pour chaque cabine.",
    depositRequired: false,
    childrenAccepted: false,
    policyClarity: "clear",
    status: "approved",
    featuredUntil: null,
    featuredRank: null,
    featuredCitySlug: null,
    featuredCategorySlug: null,
    featuredCopy: null,
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
    audience: "unisex",
    years: 9,
    bookingMode: "approval_required",
    operatingMode: "both",
    responseWindow: "Reponse sous 2 heures",
    phoneVerified: true,
    addressVerified: true,
    responseTimeTracked: false,
    cancellationNotice: "Merci d annuler au moins 24h avant votre soin.",
    lateArrivalGraceMinutes: 15,
    noShowRule: "Les no-shows repetes peuvent entrainer une confirmation manuelle.",
    hygieneNote: "Espaces humides nettoyes et prepares entre chaque seance.",
    depositRequired: false,
    childrenAccepted: true,
    policyClarity: "clear",
    status: "approved",
    featuredUntil: null,
    featuredRank: null,
    featuredCitySlug: null,
    featuredCategorySlug: null,
    featuredCopy: null,
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

const moderationRows = [
  ["seed-mod-atlas", "seed-biz-atlas", "featured", "Profile approved and featured for launch.", "Votre fiche est mise en avant sur la marketplace.", "2026-04-13 10:00:00"],
  ["seed-mod-nude", "seed-biz-nude", "approved", "Profile approved for public listing.", "Votre fiche est approuvee et visible.", "2026-04-13 10:05:00"],
  ["seed-mod-hammam", "seed-biz-hammam", "approved", "Profile approved for public listing.", "Votre fiche est approuvee et visible.", "2026-04-13 10:10:00"],
];

const activityRows = [
  ["seed-activity-atlas", "business_featured", "seed-biz-atlas", null, "Atlas Barber Club is placed as a featured partner in Tunis.", "2026-04-13 10:00:00"],
  ["seed-activity-nude", "business_status_changed", "seed-biz-nude", null, "Nude Glow Studio is live on the marketplace.", "2026-04-13 10:05:00"],
  ["seed-activity-hammam", "business_status_changed", "seed-biz-hammam", null, "Hayat Hammam & Spa is live on the marketplace.", "2026-04-13 10:10:00"],
];

try {
  await connection.beginTransaction();

  for (const user of seedUsers) {
    await connection.execute(
      `
        INSERT INTO app_users (id, role, name, email, phone, password_hash)
        VALUES (?, 'shop', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          phone = VALUES(phone),
          password_hash = VALUES(password_hash)
      `,
      [user.id, user.name, user.email, user.phone, seedPasswordHash],
    );
  }

  const businessIds = seedBusinesses.map((business) => business.id);
  const placeholders = businessIds.map(() => "?").join(", ");

  await connection.execute(`DELETE FROM activity_logs WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM moderation_history WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM waitlist_requests WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM blocked_slots WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM bookings WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM media_items WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM business_hours WHERE business_id IN (${placeholders})`, businessIds);
  await connection.execute(`DELETE FROM services WHERE business_id IN (${placeholders})`, businessIds);

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          owner_user_id = VALUES(owner_user_id),
          business_name = VALUES(business_name),
          category_slug = VALUES(category_slug),
          city_slug = VALUES(city_slug),
          area = VALUES(area),
          address = VALUES(address),
          phone = VALUES(phone),
          whatsapp = VALUES(whatsapp),
          instagram = VALUES(instagram),
          tagline = VALUES(tagline),
          description = VALUES(description),
          logo_text = VALUES(logo_text),
          cover_url = VALUES(cover_url),
          slug = VALUES(slug),
          audience = VALUES(audience),
          years_in_business = VALUES(years_in_business),
          booking_mode = VALUES(booking_mode),
          operating_mode = VALUES(operating_mode),
          response_window = VALUES(response_window),
          phone_verified = VALUES(phone_verified),
          address_verified = VALUES(address_verified),
          response_time_tracked = VALUES(response_time_tracked),
          cancellation_notice = VALUES(cancellation_notice),
          late_arrival_grace_minutes = VALUES(late_arrival_grace_minutes),
          no_show_rule = VALUES(no_show_rule),
          hygiene_note = VALUES(hygiene_note),
          deposit_required = VALUES(deposit_required),
          children_accepted = VALUES(children_accepted),
          policy_clarity = VALUES(policy_clarity),
          featured_until = VALUES(featured_until),
          featured_rank = VALUES(featured_rank),
          featured_city_slug = VALUES(featured_city_slug),
          featured_category_slug = VALUES(featured_category_slug),
          featured_copy = VALUES(featured_copy),
          status = VALUES(status),
          updated_at = NOW()
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
        business.audience,
        business.years,
        business.bookingMode,
        business.operatingMode,
        business.responseWindow,
        business.phoneVerified ? 1 : 0,
        business.addressVerified ? 1 : 0,
        business.responseTimeTracked ? 1 : 0,
        business.cancellationNotice,
        business.lateArrivalGraceMinutes,
        business.noShowRule,
        business.hygieneNote,
        business.depositRequired ? 1 : 0,
        business.childrenAccepted ? 1 : 0,
        business.policyClarity,
        business.featuredUntil,
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
          gender_target,
          featured,
          sort_order,
          active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `,
      [id, businessId, title, description, price, duration, genderTarget, featured ? 1 : 0, sortOrder],
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

  for (const [id, businessId, status, internalNote, businessMessage, changedAt] of moderationRows) {
    await connection.execute(
      `
        INSERT INTO moderation_history (id, business_id, status, internal_note, business_message, changed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, businessId, status, internalNote, businessMessage, changedAt],
    );
  }

  for (const [id, type, businessId, bookingId, summary, createdAt] of activityRows) {
    await connection.execute(
      `
        INSERT INTO activity_logs (id, type, business_id, booking_id, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, type, businessId, bookingId, summary, createdAt],
    );
  }

  await connection.commit();
  console.log("Dev database seed complete.");
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  await connection.end();
}
