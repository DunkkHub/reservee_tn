import { addDays, addMinutes, formatISO, set, startOfDay } from "date-fns";

import {
  generateBookingReferenceCode,
  getBookingExpiryAt,
} from "@/lib/platform-rules";
import type {
  BookingMode,
  Booking,
  Business,
  BusinessHours,
  BusinessPolicy,
  BusinessStatus,
  Category,
  City,
  Service,
  WaitlistRequest,
} from "@/lib/types";
import { calculateProfileCompletion } from "@/lib/utils";

type LegacyVerificationStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "rejected";

type LegacyFeaturedStatus = "standard" | "featured";

type LegacyBookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

interface LegacyBusinessSeed
  extends Omit<
    Business,
    | "status"
    | "featuredUntil"
    | "featuredRank"
    | "featuredCitySlug"
    | "featuredCategorySlug"
    | "bookingMode"
    | "operatingMode"
    | "policies"
    | "trust"
    | "moderationHistory"
    | "profileCompletion"
  > {
  profileCompletion: number;
  verificationStatus: LegacyVerificationStatus;
  featuredStatus: LegacyFeaturedStatus;
  policies: {
    cancellationNotice: string;
    lateArrivalRule: string;
    hygieneNote?: string;
  };
}

interface LegacyBookingSeed
  extends Omit<Booking, "referenceCode" | "expiresAt" | "statusUpdatedAt" | "status"> {
  status: LegacyBookingStatus;
}

function mapBusinessStatus(
  verificationStatus: LegacyVerificationStatus,
  featuredStatus: LegacyFeaturedStatus,
): BusinessStatus {
  if (verificationStatus === "draft") return "draft";
  if (verificationStatus === "pending_approval") return "pending_review";
  if (verificationStatus === "changes_requested") return "changes_requested";
  if (verificationStatus === "rejected") return "archived";
  if (verificationStatus === "approved" && featuredStatus === "featured") return "featured";
  return "approved";
}

function getBookingMode(businessId: string): BookingMode {
  return ["biz-atlas", "biz-nude"].includes(businessId)
    ? "instant"
    : "approval_required";
}

function getLateGraceMinutes(lateArrivalRule: string) {
  const matched = lateArrivalRule.match(/(\d+)/);
  return matched ? Number(matched[1]) : 10;
}

function mapPolicies(seed: LegacyBusinessSeed["policies"]): BusinessPolicy {
  return {
    cancellationNotice: seed.cancellationNotice,
    lateArrivalGraceMinutes: getLateGraceMinutes(seed.lateArrivalRule),
    noShowRule:
      "Deux absences non annulées peuvent limiter la priorité sur les prochains créneaux.",
    hygieneNote: seed.hygieneNote,
    depositRequired: false,
    childrenAccepted: true,
    policyClarity: seed.cancellationNotice && seed.lateArrivalRule ? "clear" : "needs_review",
  };
}

function mapBusiness(seed: LegacyBusinessSeed): Business {
  const status = mapBusinessStatus(seed.verificationStatus, seed.featuredStatus);
  const policy = mapPolicies(seed.policies);
  const business: Business = {
    ...seed,
    status,
    featuredUntil: status === "featured" ? formatISO(dayAt(30, 23, 0)) : null,
    featuredRank:
      status === "featured"
        ? seed.id === "biz-atlas"
          ? 1
          : 2
        : null,
    featuredCitySlug:
      status === "featured"
        ? cities.find((city) => city.id === seed.cityId)?.slug ?? null
        : null,
    featuredCategorySlug:
      status === "featured"
        ? categories.find((category) => category.id === seed.categoryId)?.slug ?? null
        : null,
    bookingMode: getBookingMode(seed.id),
    operatingMode: seed.id === "biz-hammam" ? "both" : "appointment_only",
    policies: policy,
    trust: {
      phoneVerified: status === "approved" || status === "featured",
      addressVerified: status === "approved" || status === "featured",
      adminApproved: status === "approved" || status === "featured",
      responseTimeTracked: seed.responseWindow.includes("moins"),
      policyClarityBadge: policy.policyClarity === "clear",
    },
    moderationHistory: [
      {
        id: `${seed.id}-moderation-1`,
        businessId: seed.id,
        status,
        internalNote:
          status === "changes_requested"
            ? "Profil presque prêt, mais il demande de meilleures photos et des horaires plus précis."
            : status === "pending_review"
              ? "En attente de vérification finale avant mise en ligne."
              : "Profil valide pour la place de marché.",
        businessMessage:
          status === "changes_requested"
            ? "Ajoutez plus de visuels et clarifiez vos horaires pour passer en revue finale."
            : status === "pending_review"
              ? "Votre fiche est en cours de revue."
              : "Votre fiche respecte les exigences de qualité.",
        changedAt: formatISO(dayAt(-1, 10, 0)),
      },
    ],
    profileCompletion: 0,
  };

  return {
    ...business,
    profileCompletion: calculateProfileCompletion(business),
  };
}

function mapBookingStatus(status: LegacyBookingStatus): Booking["status"] {
  if (status === "cancelled") {
    return "cancelled_by_customer";
  }

  return status;
}

function mapBooking(seed: LegacyBookingSeed): Booking {
  const status = mapBookingStatus(seed.status);
  return {
    ...seed,
    status,
    referenceCode: generateBookingReferenceCode(),
    expiresAt: status === "pending" ? getBookingExpiryAt(seed.createdAt, seed.startAt) : null,
    statusUpdatedAt: seed.createdAt,
  };
}

function buildHours(
  businessId: string,
  options: {
    open: string;
    close: string;
    closedDays?: number[];
    breakWindow?: { start: string; end: string };
  },
) {
  return Array.from({ length: 7 }, (_, dayOfWeek): BusinessHours => ({
    id: `${businessId}-hours-${dayOfWeek}`,
    businessId,
    dayOfWeek,
    openTime: options.open,
    closeTime: options.close,
    isClosed: options.closedDays?.includes(dayOfWeek) ?? false,
    breaks: options.breakWindow ? [options.breakWindow] : [],
  }));
}

function buildService(
  businessId: string,
  id: string,
  title: string,
  price: number,
  durationMinutes: number,
  description: string,
  genderTarget: Service["genderTarget"],
  featured = false,
): Service {
  return {
    id,
    businessId,
    title,
    price,
    durationMinutes,
    description,
    active: true,
    featured,
    genderTarget,
  };
}

function dayAt(daysFromNow: number, hours: number, minutes: number) {
  const day = addDays(startOfDay(new Date()), daysFromNow);
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
}

export const categories: Category[] = [
  {
    id: "cat-barbers",
    name: "Barbiers",
    slug: "barbers",
    shortLabel: "Barbers",
    description: "Fades, grooming et barbe avec une expérience premium.",
    icon: "ScissorsLineDashed",
  },
  {
    id: "cat-hair",
    name: "Salons de coiffure",
    slug: "hair-salons",
    shortLabel: "Salons",
    description: "Coupes, brushing, coloration et soins capillaires haut de gamme.",
    icon: "Sparkles",
  },
  {
    id: "cat-beauty",
    name: "Centres de beauté",
    slug: "beauty-centers",
    shortLabel: "Beauté",
    description: "Soins visage, maquillage et routines beauté en un seul lieu.",
    icon: "Flower2",
  },
  {
    id: "cat-nails",
    name: "Studios onglerie",
    slug: "nail-studios",
    shortLabel: "Nails",
    description: "Manucure, gel, nail art et soins des mains dans un cadre design.",
    icon: "Hand",
  },
  {
    id: "cat-spa",
    name: "Spas & hammams",
    slug: "spas",
    shortLabel: "Spa",
    description: "Massages, hammam, rituels corps et détente profonde.",
    icon: "Leaf",
  },
];

export const cities: City[] = [
  {
    id: "city-tunis",
    name: "Tunis",
    slug: "tunis",
    heroCopy:
      "Les adresses les plus réservées autour du centre-ville, du Lac et de La Marsa.",
  },
  {
    id: "city-sousse",
    name: "Sousse",
    slug: "sousse",
    heroCopy: "Des salons modernes et des spots bien-être qui convertissent bien sur mobile.",
  },
  {
    id: "city-sfax",
    name: "Sfax",
    slug: "sfax",
    heroCopy: "Une scène beauté locale exigeante, parfaite pour un produit simple et premium.",
  },
  {
    id: "city-ariana",
    name: "Ariana",
    slug: "ariana",
    heroCopy:
      "Une zone dense avec de fortes habitudes WhatsApp et beaucoup d’opportunités B2B.",
  },
  {
    id: "city-nabeul",
    name: "Nabeul",
    slug: "nabeul",
    heroCopy:
      "Des studios beauté de quartier qui ont besoin de visibilité et d’un agenda propre.",
  },
  {
    id: "city-hammamet",
    name: "Hammamet",
    slug: "hammamet",
    heroCopy: "Idéal pour les spas, salons premium et expériences bien-être destination.",
  },
];

const atlasServices = [
  buildService(
    "biz-atlas",
    "srv-atlas-fade",
    "Skin fade signature",
    35,
    45,
    "Dégradé ultra propre, contour précision et finition vapeur chaude.",
    "men",
    true,
  ),
  buildService(
    "biz-atlas",
    "srv-atlas-beard",
    "Barbe + serviette chaude",
    28,
    30,
    "Taille, line-up et soin finition huile parfumée.",
    "men",
  ),
  buildService(
    "biz-atlas",
    "srv-atlas-cut",
    "Coupe classique",
    25,
    30,
    "Coupe propre pour rendez-vous rapides et régulièrement réservés.",
    "men",
  ),
  buildService(
    "biz-atlas",
    "srv-atlas-premium",
    "Pack premium coupe + barbe",
    55,
    60,
    "Le combo le plus réservé le vendredi et avant week-end.",
    "men",
  ),
  buildService(
    "biz-atlas",
    "srv-atlas-mask",
    "Soin detox visage",
    22,
    25,
    "Nettoyage express idéal après coupe ou barbe.",
    "men",
  ),
];

const nouraServices = [
  buildService(
    "biz-noura",
    "srv-noura-brushing",
    "Brushing glossy",
    55,
    45,
    "Brushing lisse ou volume avec finition lumineuse.",
    "women",
    true,
  ),
  buildService(
    "biz-noura",
    "srv-noura-color",
    "Coloration racines",
    95,
    90,
    "Application pro avec diagnostic et soin fixateur.",
    "women",
  ),
  buildService(
    "biz-noura",
    "srv-noura-cut",
    "Coupe + brushing",
    70,
    60,
    "Coupe conseil et mise en forme complète.",
    "women",
  ),
  buildService(
    "biz-noura",
    "srv-noura-treatment",
    "Soin profond kératine",
    120,
    75,
    "Soin nutritif pour cheveux fatigués ou colorés.",
    "women",
  ),
  buildService(
    "biz-noura",
    "srv-noura-party",
    "Coiffure événement",
    140,
    90,
    "Attache ou ondulations douces pour mariage et soirée.",
    "women",
  ),
];

const jasminServices = [
  buildService(
    "biz-jasmin",
    "srv-jasmin-facial",
    "Soin visage éclat",
    68,
    60,
    "Nettoyage profond, vapeur douce et masque glow.",
    "unisex",
    true,
  ),
  buildService(
    "biz-jasmin",
    "srv-jasmin-brow",
    "Restructuration sourcils",
    22,
    25,
    "Mise en forme naturelle et rapide.",
    "women",
  ),
  buildService(
    "biz-jasmin",
    "srv-jasmin-makeup",
    "Maquillage soft glam",
    95,
    70,
    "Maquillage net, lumineux et longue tenue.",
    "women",
  ),
  buildService(
    "biz-jasmin",
    "srv-jasmin-wax",
    "Épilation jambes",
    40,
    35,
    "Service express réserve surtout en semaine.",
    "women",
  ),
  buildService(
    "biz-jasmin",
    "srv-jasmin-lash",
    "Lash lift",
    78,
    50,
    "Courbure douce et regard défini sans mascara.",
    "women",
  ),
];

const nudeServices = [
  buildService(
    "biz-nude",
    "srv-nude-gel",
    "Pose gel signature",
    58,
    75,
    "Pose structurée propre avec couleur nude ou french.",
    "women",
    true,
  ),
  buildService(
    "biz-nude",
    "srv-nude-mani",
    "Manucure clean",
    32,
    35,
    "Soin des cuticules et finition brillance.",
    "women",
  ),
  buildService(
    "biz-nude",
    "srv-nude-pedi",
    "Pédicure spa",
    44,
    45,
    "Bain, gommage léger et vernis simple.",
    "women",
  ),
  buildService(
    "biz-nude",
    "srv-nude-art",
    "Nail art minimal",
    18,
    20,
    "Ajout détail chrome, ligne fine ou accent doré.",
    "women",
  ),
  buildService(
    "biz-nude",
    "srv-nude-removal",
    "Dépose + soin",
    20,
    25,
    "Retrait propre sans agresser l’ongle naturel.",
    "women",
  ),
];

const hammamServices = [
  buildService(
    "biz-hammam",
    "srv-hammam-ritual",
    "Rituel hammam signature",
    95,
    90,
    "Vapeur, savon noir, gommage et moment tisane.",
    "unisex",
    true,
  ),
  buildService(
    "biz-hammam",
    "srv-hammam-massage",
    "Massage relaxant 60 min",
    110,
    60,
    "Pression moyenne et ambiance très calme.",
    "unisex",
  ),
  buildService(
    "biz-hammam",
    "srv-hammam-duo",
    "Duo hammam + massage",
    180,
    120,
    "Pack couple ou ami avec pause infusion.",
    "unisex",
  ),
  buildService(
    "biz-hammam",
    "srv-hammam-face",
    "Soin corps oriental",
    88,
    75,
    "Enveloppement doux et hydratation profonde.",
    "unisex",
  ),
  buildService(
    "biz-hammam",
    "srv-hammam-express",
    "Massage express 30 min",
    62,
    30,
    "Parfait pour les clients hotel ou pause midi.",
    "unisex",
  ),
];

const pendingSalonServices = [
  buildService("biz-ruby", "srv-ruby-cut", "Coupe femme", 48, 45, "Draft service.", "women"),
];

const pendingBeautyServices = [
  buildService("biz-lina", "srv-lina-face", "Soin purifiant", 58, 50, "Draft service.", "women"),
];

const baseBusinesses: LegacyBusinessSeed[] = [
  {
    id: "biz-atlas",
    ownerId: "owner-atlas",
    name: "Atlas Barber Club",
    slug: "atlas-barber-club",
    categoryId: "cat-barbers",
    cityId: "city-tunis",
    area: "La Marsa",
    address: "25 Avenue Taieb Mhiri, La Marsa, Tunis",
    phone: "+216 52 111 210",
    whatsapp: "+216 52 111 210",
    instagram: "@atlasbarberclub",
    tagline: "Fades propres, barbe nette, service sans friction.",
    description:
      "Atlas Barber Club est pensé pour les rendez-vous rapides mais impeccables. Les services sont clairs, les prix visibles et le prochain créneau libre apparaît tout de suite sur mobile.",
    logoText: "AB",
    coverUrl:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "approved",
    featuredStatus: "featured",
    profileCompletion: 0,
    audience: "men",
    yearsInBusiness: 6,
    featuredCopy: "Le plus réservé aujourd’hui à Tunis.",
    responseWindow: "Répond en moins de 15 min",
    services: atlasServices,
    hours: buildHours("biz-atlas", {
      open: "09:00",
      close: "20:00",
      closedDays: [0],
      breakWindow: { start: "13:00", end: "14:00" },
    }),
    blockedSlots: [
      {
        id: "block-atlas-1",
        businessId: "biz-atlas",
        startAt: formatISO(dayAt(0, 18, 0)),
        endAt: formatISO(dayAt(0, 19, 0)),
        reason: "Formation équipe",
      },
    ],
    media: [
      {
        id: "atlas-cover",
        businessId: "biz-atlas",
        type: "cover",
        url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
        alt: "Barber shop premium",
      },
      {
        id: "atlas-1",
        businessId: "biz-atlas",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
        alt: "Client haircut",
      },
      {
        id: "atlas-2",
        businessId: "biz-atlas",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1503951458645-643d53bfd90f?auto=format&fit=crop&w=1200&q=80",
        alt: "Barber tools",
      },
      {
        id: "atlas-3",
        businessId: "biz-atlas",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1512690459411-b0fd1cb8fb32?auto=format&fit=crop&w=1200&q=80",
        alt: "Premium chair",
      },
      {
        id: "atlas-4",
        businessId: "biz-atlas",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80",
        alt: "Beard grooming",
      },
    ],
    policies: {
      cancellationNotice: "Annulation idéale 3 h avant le rendez-vous.",
      lateArrivalRule: "10 min de retard max avant replanification.",
      hygieneNote: "Outils désinfectés entre chaque client.",
    },
    metrics: {
      profileViews: 782,
      bookingsThisWeek: 26,
      missedBookings: 2,
      busyDays: ["Vendredi", "Samedi"],
      mostBookedServiceId: "srv-atlas-fade",
    },
    createdAt: formatISO(dayAt(-120, 10, 0)),
  },
  {
    id: "biz-noura",
    ownerId: "owner-noura",
    name: "Maison Noura",
    slug: "maison-noura",
    categoryId: "cat-hair",
    cityId: "city-tunis",
    area: "Lac 2",
    address: "Rue du Lac Biwa, Les Berges du Lac 2, Tunis",
    phone: "+216 58 342 118",
    whatsapp: "+216 58 342 118",
    instagram: "@maisonnoura.tn",
    tagline: "Coloration, brushing et finitions ultra propres.",
    description:
      "Maison Noura vise une clientèle qui veut réserver vite mais sentir un vrai niveau de standing. Les services sont présentés comme un menu clair, avec durées précises et disponibilités visibles.",
    logoText: "MN",
    coverUrl:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "approved",
    featuredStatus: "featured",
    profileCompletion: 0,
    audience: "women",
    yearsInBusiness: 4,
    featuredCopy: "Un salon premium très partagé sur Instagram.",
    responseWindow: "Répond en moins de 30 min",
    services: nouraServices,
    hours: buildHours("biz-noura", {
      open: "10:00",
      close: "19:00",
      closedDays: [1],
      breakWindow: { start: "14:00", end: "14:45" },
    }),
    blockedSlots: [
      {
        id: "block-noura-1",
        businessId: "biz-noura",
        startAt: formatISO(dayAt(1, 12, 0)),
        endAt: formatISO(dayAt(1, 13, 30)),
        reason: "Session photo",
      },
    ],
    media: [
      {
        id: "noura-cover",
        businessId: "biz-noura",
        type: "cover",
        url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80",
        alt: "Salon premium",
      },
      {
        id: "noura-1",
        businessId: "biz-noura",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
        alt: "Hair styling",
      },
      {
        id: "noura-2",
        businessId: "biz-noura",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
        alt: "Salon interior",
      },
      {
        id: "noura-3",
        businessId: "biz-noura",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=80",
        alt: "Hair treatment",
      },
      {
        id: "noura-4",
        businessId: "biz-noura",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
        alt: "Beauty portrait",
      },
    ],
    policies: {
      cancellationNotice: "Annulation souhaitée 6 h avant.",
      lateArrivalRule: "15 min de retard max pour garder le créneau.",
      hygieneNote: "Serviettes et postes renouvelés entre chaque cliente.",
    },
    metrics: {
      profileViews: 640,
      bookingsThisWeek: 19,
      missedBookings: 1,
      busyDays: ["Jeudi", "Samedi"],
      mostBookedServiceId: "srv-noura-brushing",
    },
    createdAt: formatISO(dayAt(-90, 11, 0)),
  },
  {
    id: "biz-jasmin",
    ownerId: "owner-jasmin",
    name: "Studio Jasmin",
    slug: "studio-jasmin",
    categoryId: "cat-beauty",
    cityId: "city-sousse",
    area: "Khezama",
    address: "12 Rue des Palmiers, Khezama, Sousse",
    phone: "+216 53 814 900",
    whatsapp: "+216 53 814 900",
    instagram: "@studiojasmin.sousse",
    tagline: "Soins visage, lashes et make-up dans un seul espace calme.",
    description:
      "Studio Jasmin transforme la fiche partenaire en vraie vitrine. Les photos rassurent, les services sont nets, et la prochaine disponibilité est visible sans appeler ni envoyer trois messages WhatsApp.",
    logoText: "SJ",
    coverUrl:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "approved",
    featuredStatus: "standard",
    profileCompletion: 0,
    audience: "women",
    yearsInBusiness: 5,
    responseWindow: "Répond en moins de 45 min",
    services: jasminServices,
    hours: buildHours("biz-jasmin", {
      open: "09:30",
      close: "18:30",
      closedDays: [0],
      breakWindow: { start: "13:30", end: "14:15" },
    }),
    blockedSlots: [],
    media: [
      {
        id: "jasmin-cover",
        businessId: "biz-jasmin",
        type: "cover",
        url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
        alt: "Beauty studio",
      },
      {
        id: "jasmin-1",
        businessId: "biz-jasmin",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
        alt: "Beauty treatment",
      },
      {
        id: "jasmin-2",
        businessId: "biz-jasmin",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80",
        alt: "Makeup station",
      },
      {
        id: "jasmin-3",
        businessId: "biz-jasmin",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80",
        alt: "Beauty portrait",
      },
      {
        id: "jasmin-4",
        businessId: "biz-jasmin",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=80",
        alt: "Facial detail",
      },
    ],
    policies: {
      cancellationNotice: "Annulation souhaitée 4 h avant.",
      lateArrivalRule: "10 min avant mise en attente du créneau.",
      hygieneNote: "Cabine préparée et matériel stérilisé.",
    },
    metrics: {
      profileViews: 422,
      bookingsThisWeek: 13,
      missedBookings: 1,
      busyDays: ["Mercredi", "Vendredi"],
      mostBookedServiceId: "srv-jasmin-facial",
    },
    createdAt: formatISO(dayAt(-70, 12, 0)),
  },
  {
    id: "biz-nude",
    ownerId: "owner-nude",
    name: "Nude Nail Atelier",
    slug: "nude-nail-atelier",
    categoryId: "cat-nails",
    cityId: "city-ariana",
    area: "Ennasr 2",
    address: "38 Avenue Hedi Nouira, Ennasr 2, Ariana",
    phone: "+216 28 774 201",
    whatsapp: "+216 28 774 201",
    instagram: "@nudenailatelier",
    tagline: "Ongles propres, design minimal et timing bien géré.",
    description:
      "Nude Nail Atelier montre à quoi doit ressembler une fiche premium : image forte, créneaux propres, infos de confiance et réservation en moins d’une minute depuis mobile.",
    logoText: "NN",
    coverUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "approved",
    featuredStatus: "featured",
    profileCompletion: 0,
    audience: "women",
    yearsInBusiness: 3,
    featuredCopy: "Le studio nails qui convertit le mieux sur mobile.",
    responseWindow: "Répond en moins de 20 min",
    services: nudeServices,
    hours: buildHours("biz-nude", {
      open: "10:00",
      close: "20:00",
      closedDays: [0],
      breakWindow: { start: "14:30", end: "15:00" },
    }),
    blockedSlots: [
      {
        id: "block-nude-1",
        businessId: "biz-nude",
        startAt: formatISO(dayAt(2, 17, 0)),
        endAt: formatISO(dayAt(2, 18, 30)),
        reason: "Shooting partenaires",
      },
    ],
    media: [
      {
        id: "nude-cover",
        businessId: "biz-nude",
        type: "cover",
        url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80",
        alt: "Nail studio",
      },
      {
        id: "nude-1",
        businessId: "biz-nude",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80",
        alt: "Nail detail",
      },
      {
        id: "nude-2",
        businessId: "biz-nude",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1200&q=80",
        alt: "Hands manicure",
      },
      {
        id: "nude-3",
        businessId: "biz-nude",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80",
        alt: "Nail station",
      },
      {
        id: "nude-4",
        businessId: "biz-nude",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1200&q=80",
        alt: "Color palette",
      },
    ],
    policies: {
      cancellationNotice: "Annulation souhaitée 4 h avant.",
      lateArrivalRule: "10 min max avant adaptation du service.",
      hygieneNote: "Limes à usage unique et poste désinfecté.",
    },
    metrics: {
      profileViews: 588,
      bookingsThisWeek: 21,
      missedBookings: 3,
      busyDays: ["Jeudi", "Samedi"],
      mostBookedServiceId: "srv-nude-gel",
    },
    createdAt: formatISO(dayAt(-45, 10, 0)),
  },
  {
    id: "biz-hammam",
    ownerId: "owner-hammam",
    name: "Hammam Elegance",
    slug: "hammam-elegance",
    categoryId: "cat-spa",
    cityId: "city-hammamet",
    area: "Centre",
    address: "Rue de la Mediterranee, Hammamet Centre",
    phone: "+216 29 882 410",
    whatsapp: "+216 29 882 410",
    instagram: "@hammamelegance",
    tagline: "Rituels spa et hammam réservés comme une table haut de gamme.",
    description:
      "Hammam Elegance donne au spa une présence digitale plus sérieuse : beau visuel, menu clair, créneaux libres, infos de politique et contact WhatsApp en secours.",
    logoText: "HE",
    coverUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "approved",
    featuredStatus: "standard",
    profileCompletion: 0,
    audience: "unisex",
    yearsInBusiness: 8,
    responseWindow: "Répond en moins de 1 h",
    services: hammamServices,
    hours: buildHours("biz-hammam", {
      open: "10:00",
      close: "21:00",
      breakWindow: { start: "15:00", end: "16:00" },
    }),
    blockedSlots: [],
    media: [
      {
        id: "hammam-cover",
        businessId: "biz-hammam",
        type: "cover",
        url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
        alt: "Spa interior",
      },
      {
        id: "hammam-1",
        businessId: "biz-hammam",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
        alt: "Spa ritual",
      },
      {
        id: "hammam-2",
        businessId: "biz-hammam",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
        alt: "Treatment room",
      },
      {
        id: "hammam-3",
        businessId: "biz-hammam",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80",
        alt: "Spa towel detail",
      },
      {
        id: "hammam-4",
        businessId: "biz-hammam",
        type: "gallery",
        url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
        alt: "Wellness ambiance",
      },
    ],
    policies: {
      cancellationNotice: "Annulation souhaitée 12 h avant.",
      lateArrivalRule: "15 min max pour garder le rituel complet.",
      hygieneNote: "Cabines, draps et zones humides contrôlées toute la journée.",
    },
    metrics: {
      profileViews: 356,
      bookingsThisWeek: 11,
      missedBookings: 1,
      busyDays: ["Vendredi", "Dimanche"],
      mostBookedServiceId: "srv-hammam-ritual",
    },
    createdAt: formatISO(dayAt(-150, 9, 0)),
  },
  {
    id: "biz-ruby",
    ownerId: "owner-ruby",
    name: "Ruby Blow Studio",
    slug: "ruby-blow-studio",
    categoryId: "cat-hair",
    cityId: "city-sfax",
    area: "Sakiet Ezzit",
    address: "Route de Tunis KM 4, Sfax",
    phone: "+216 55 910 712",
    whatsapp: "+216 55 910 712",
    instagram: "@rubyblow.studio",
    tagline: "Nouveau salon en attente de validation.",
    description:
      "Le profil est presque prêt, mais il manque encore une couverture plus propre et quelques services détaillés.",
    logoText: "RB",
    coverUrl:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "pending_approval",
    featuredStatus: "standard",
    profileCompletion: 0,
    audience: "women",
    yearsInBusiness: 1,
    responseWindow: "Répond dans la journée",
    services: pendingSalonServices,
    hours: buildHours("biz-ruby", {
      open: "09:00",
      close: "18:00",
      closedDays: [0],
    }),
    blockedSlots: [],
    media: [
      {
        id: "ruby-cover",
        businessId: "biz-ruby",
        type: "cover",
        url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
        alt: "Hair studio draft",
      },
    ],
    policies: {
      cancellationNotice: "Annulation 4 h avant.",
      lateArrivalRule: "15 min max.",
    },
    metrics: {
      profileViews: 24,
      bookingsThisWeek: 0,
      missedBookings: 0,
      busyDays: ["Samedi"],
      mostBookedServiceId: "srv-ruby-cut",
    },
    createdAt: formatISO(dayAt(-5, 14, 0)),
  },
  {
    id: "biz-lina",
    ownerId: "owner-lina",
    name: "Lina Wellness House",
    slug: "lina-wellness-house",
    categoryId: "cat-beauty",
    cityId: "city-nabeul",
    area: "Dar Chaabane",
    address: "Avenue Habib Bourguiba, Dar Chaabane, Nabeul",
    phone: "+216 27 110 805",
    whatsapp: "+216 27 110 805",
    instagram: "@linawellnesshouse",
    tagline: "Centre beauté en attente de retouches avant mise en ligne.",
    description:
      "Le centre doit encore compléter ses horaires et enrichir sa galerie avant approbation finale.",
    logoText: "LW",
    coverUrl:
      "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: "changes_requested",
    featuredStatus: "standard",
    profileCompletion: 0,
    audience: "women",
    yearsInBusiness: 2,
    responseWindow: "Répond dans la journée",
    services: pendingBeautyServices,
    hours: buildHours("biz-lina", {
      open: "10:00",
      close: "18:00",
      closedDays: [0],
    }),
    blockedSlots: [],
    media: [
      {
        id: "lina-cover",
        businessId: "biz-lina",
        type: "cover",
        url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80",
        alt: "Beauty center draft",
      },
    ],
    policies: {
      cancellationNotice: "Annulation 4 h avant.",
      lateArrivalRule: "10 min max.",
    },
    metrics: {
      profileViews: 16,
      bookingsThisWeek: 0,
      missedBookings: 0,
      busyDays: ["Vendredi"],
      mostBookedServiceId: "srv-lina-face",
    },
    createdAt: formatISO(dayAt(-8, 10, 0)),
  },
];

export const businesses: Business[] = baseBusinesses.map(mapBusiness);

export const LIVE_BUSINESS_ID = "biz-atlas";

const baseBookings: LegacyBookingSeed[] = [
  {
    id: "booking-atlas-1",
    businessId: "biz-atlas",
    serviceId: "srv-atlas-fade",
    customerName: "Youssef Ben Ali",
    customerPhone: "+216 95 001 221",
    customerNote: "Besoin d’une coupe nette avant réunion.",
    startAt: formatISO(dayAt(0, 10, 0)),
    endAt: formatISO(addMinutes(dayAt(0, 10, 0), 45)),
    status: "confirmed",
    source: "web",
    createdAt: formatISO(dayAt(-1, 20, 0)),
  },
  {
    id: "booking-atlas-2",
    businessId: "biz-atlas",
    serviceId: "srv-atlas-premium",
    customerName: "Anis Hmidi",
    customerPhone: "+216 29 888 021",
    startAt: formatISO(dayAt(0, 15, 0)),
    endAt: formatISO(addMinutes(dayAt(0, 15, 0), 60)),
    status: "pending",
    source: "web",
    createdAt: formatISO(dayAt(-1, 21, 0)),
  },
  {
    id: "booking-noura-1",
    businessId: "biz-noura",
    serviceId: "srv-noura-brushing",
    customerName: "Asma Cherif",
    customerPhone: "+216 23 778 990",
    startAt: formatISO(dayAt(1, 11, 0)),
    endAt: formatISO(addMinutes(dayAt(1, 11, 0), 45)),
    status: "confirmed",
    source: "web",
    createdAt: formatISO(dayAt(-1, 12, 0)),
  },
  {
    id: "booking-noura-2",
    businessId: "biz-noura",
    serviceId: "srv-noura-color",
    customerName: "Meriem Gharbi",
    customerPhone: "+216 20 110 871",
    startAt: formatISO(dayAt(2, 16, 0)),
    endAt: formatISO(addMinutes(dayAt(2, 16, 0), 90)),
    status: "pending",
    source: "web",
    createdAt: formatISO(dayAt(-1, 18, 0)),
  },
  {
    id: "booking-jasmin-1",
    businessId: "biz-jasmin",
    serviceId: "srv-jasmin-facial",
    customerName: "Rim Jallouli",
    customerPhone: "+216 54 550 120",
    startAt: formatISO(dayAt(0, 12, 0)),
    endAt: formatISO(addMinutes(dayAt(0, 12, 0), 60)),
    status: "completed",
    source: "dashboard",
    createdAt: formatISO(dayAt(-2, 15, 0)),
  },
  {
    id: "booking-nude-1",
    businessId: "biz-nude",
    serviceId: "srv-nude-gel",
    customerName: "Chaima Khemiri",
    customerPhone: "+216 97 112 445",
    startAt: formatISO(dayAt(1, 14, 0)),
    endAt: formatISO(addMinutes(dayAt(1, 14, 0), 75)),
    status: "confirmed",
    source: "web",
    createdAt: formatISO(dayAt(-1, 8, 0)),
  },
  {
    id: "booking-hammam-1",
    businessId: "biz-hammam",
    serviceId: "srv-hammam-ritual",
    customerName: "Fatma Trabelsi",
    customerPhone: "+216 26 908 310",
    startAt: formatISO(dayAt(2, 11, 0)),
    endAt: formatISO(addMinutes(dayAt(2, 11, 0), 90)),
    status: "pending",
    source: "web",
    createdAt: formatISO(dayAt(-1, 17, 0)),
  },
  {
    id: "booking-atlas-old",
    businessId: "biz-atlas",
    serviceId: "srv-atlas-cut",
    customerName: "Karim Chatti",
    customerPhone: "+216 22 003 440",
    startAt: formatISO(dayAt(-1, 17, 0)),
    endAt: formatISO(addMinutes(dayAt(-1, 17, 0), 30)),
    status: "no_show",
    source: "dashboard",
    createdAt: formatISO(dayAt(-2, 18, 0)),
  },
];

export const initialBookings: Booking[] = baseBookings.map(mapBooking);

export const initialWaitlistRequests: WaitlistRequest[] = [
  {
    id: "waitlist-1",
    businessId: "biz-hammam",
    serviceId: "srv-hammam-ritual",
    customerName: "Ines Ben Salem",
    customerPhone: "+216 24 441 008",
    preferredDate: formatISO(dayAt(3, 0, 0)),
    preferredTime: "17:00 - 19:00",
    note: "Je préfère un créneau hammam en fin d’après-midi si quelque chose se libère.",
    createdAt: formatISO(dayAt(-1, 16, 0)),
  },
];
