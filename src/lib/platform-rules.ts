import { addHours, formatISO, isAfter } from "date-fns";

import type {
  Booking,
  BookingStatus,
  Business,
  BusinessMetrics,
  BusinessPolicy,
  BusinessStatus,
  BusinessTrust,
  MediaItem,
} from "@/lib/types";

export const BOOKING_EXPIRY_HOURS = 2;
export const DEFAULT_FEATURED_DAYS = 14;
export const MAX_GALLERY_IMAGES = 8;

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
  noShowRule: "",
  hygieneNote: "",
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

export function getBookingExpiryAt(createdAt: string, startAt: string) {
  const createdExpiry = addHours(new Date(createdAt), BOOKING_EXPIRY_HOURS);
  const slotStart = new Date(startAt);
  return formatISO(createdExpiry < slotStart ? createdExpiry : slotStart);
}

export function normalizeBooking(booking: Booking) {
  if (booking.status !== "pending") {
    return booking;
  }

  const expiresAt = booking.expiresAt ?? getBookingExpiryAt(booking.createdAt, booking.startAt);
  const now = new Date();

  if (isAfter(now, new Date(expiresAt)) || now.getTime() >= new Date(booking.startAt).getTime()) {
    return {
      ...booking,
      status: "expired" as BookingStatus,
      expiresAt,
      statusUpdatedAt: formatISO(now),
    };
  }

  return {
    ...booking,
    expiresAt,
  };
}

export function normalizeBusiness(business?: Partial<Business> | null): Business {
  const now = new Date();
  const safeBusiness = business ?? {};
  const trust = {
    ...defaultTrust,
    ...(safeBusiness.trust ?? {}),
  };
  const policies = {
    ...defaultPolicies,
    ...(safeBusiness.policies ?? {}),
  };
  const normalizedBusiness: Business = {
    id: safeBusiness.id ?? "",
    ownerId: safeBusiness.ownerId ?? "",
    name: safeBusiness.name ?? "",
    slug: safeBusiness.slug ?? "",
    categoryId: safeBusiness.categoryId ?? "",
    cityId: safeBusiness.cityId ?? "",
    area: safeBusiness.area ?? "",
    address: safeBusiness.address ?? "",
    phone: safeBusiness.phone ?? "",
    whatsapp: safeBusiness.whatsapp ?? "",
    instagram: safeBusiness.instagram ?? "",
    tagline: safeBusiness.tagline ?? "",
    description: safeBusiness.description ?? "",
    logoText: safeBusiness.logoText ?? "",
    coverUrl: safeBusiness.coverUrl ?? "",
    status: safeBusiness.status ?? "draft",
    featuredUntil: safeBusiness.featuredUntil ?? null,
    featuredRank: safeBusiness.featuredRank ?? null,
    featuredCitySlug: safeBusiness.featuredCitySlug ?? null,
    featuredCategorySlug: safeBusiness.featuredCategorySlug ?? null,
    profileCompletion: safeBusiness.profileCompletion ?? 0,
    audience: safeBusiness.audience ?? "unisex",
    yearsInBusiness: safeBusiness.yearsInBusiness ?? 0,
    bookingMode: safeBusiness.bookingMode ?? "approval_required",
    operatingMode: safeBusiness.operatingMode ?? "appointment_only",
    featuredCopy: safeBusiness.featuredCopy,
    responseWindow: safeBusiness.responseWindow ?? "",
    trust,
    policies,
    services: Array.isArray(safeBusiness.services) ? safeBusiness.services : [],
    hours: Array.isArray(safeBusiness.hours) ? safeBusiness.hours : [],
    blockedSlots: Array.isArray(safeBusiness.blockedSlots) ? safeBusiness.blockedSlots : [],
    media: Array.isArray(safeBusiness.media) ? safeBusiness.media : [],
    moderationHistory: Array.isArray(safeBusiness.moderationHistory)
      ? safeBusiness.moderationHistory
      : [],
    metrics: {
      ...defaultMetrics,
      ...(safeBusiness.metrics ?? {}),
      busyDays: Array.isArray(safeBusiness.metrics?.busyDays)
        ? safeBusiness.metrics.busyDays
        : [],
    },
    createdAt: safeBusiness.createdAt ?? new Date(0).toISOString(),
  };

  if (
    normalizedBusiness.status === "featured" &&
    normalizedBusiness.featuredUntil &&
    new Date(normalizedBusiness.featuredUntil).getTime() < now.getTime()
  ) {
    return {
      ...normalizedBusiness,
      status: "approved" as BusinessStatus,
      featuredUntil: null,
      featuredRank: null,
      featuredCitySlug: null,
      featuredCategorySlug: null,
      trust: {
        ...trust,
        adminApproved: true,
      },
    };
  }

  return {
    ...normalizedBusiness,
    trust: {
      ...trust,
      adminApproved:
        normalizedBusiness.status === "approved" || normalizedBusiness.status === "featured",
    },
  };
}

export function isBusinessLive(status: BusinessStatus) {
  return status === "approved" || status === "featured";
}

export function isBusinessFeatured(business: Business) {
  return business.status === "featured";
}

export function isBookingBlocking(status: BookingStatus) {
  return status === "pending" || status === "confirmed";
}

export function canCustomerCancel(booking: Booking) {
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    new Date(booking.startAt).getTime() > Date.now()
  );
}

export function canBusinessReject(booking: Booking) {
  return booking.status === "pending";
}

export function canBusinessConfirm(booking: Booking) {
  return booking.status === "pending";
}

export function canBusinessComplete(booking: Booking) {
  return booking.status === "confirmed";
}

export function canRequestReschedule(booking: Booking) {
  return booking.status === "pending" || booking.status === "confirmed";
}

export function businessStatusLabel(status: BusinessStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_review":
      return "Pending review";
    case "changes_requested":
      return "Changes requested";
    case "approved":
      return "Approved";
    case "featured":
      return "Featured";
    case "suspended":
      return "Suspended";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function businessStatusTone(status: BusinessStatus) {
  switch (status) {
    case "featured":
      return "accent";
    case "approved":
      return "success";
    case "pending_review":
      return "warning";
    case "changes_requested":
      return "warning";
    case "suspended":
      return "danger";
    case "archived":
      return "muted";
    default:
      return "default";
  }
}

export function bookingStatusTone(status: BookingStatus) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "pending":
      return "accent";
    case "cancelled_by_customer":
    case "cancelled_by_business":
    case "rejected":
      return "danger";
    case "expired":
    case "no_show":
      return "warning";
    default:
      return "default";
  }
}

export function generateBookingReferenceCode() {
  return `RB-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
    .toString()
    .slice(-4)}`;
}

export function getGalleryItems(media: MediaItem[]) {
  return media.filter((item) => item.type === "gallery");
}

export function getOnboardingChecklist(business: Business) {
  return [
    {
      id: "basics",
      label: "Basic info complete",
      complete: Boolean(
        business.name.trim() &&
          business.address.trim() &&
          business.phone.trim() &&
          business.whatsapp.trim(),
      ),
    },
    {
      id: "services",
      label: "Services complete",
      complete: business.services.filter((service) => service.active).length >= 5,
    },
    {
      id: "hours",
      label: "Hours complete",
      complete: business.hours.some((hour) => !hour.isClosed),
    },
    {
      id: "photos",
      label: "Photos complete",
      complete: getGalleryItems(business.media).length >= 4,
    },
    {
      id: "policies",
      label: "Policy complete",
      complete: business.policies.policyClarity === "clear",
    },
  ];
}
