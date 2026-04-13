"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { addDays, formatISO } from "date-fns";

import { useAuth } from "@/components/providers/auth-provider";
import { createEndAt } from "@/lib/availability";
import {
  DEFAULT_FEATURED_DAYS,
  canRequestReschedule,
  generateBookingReferenceCode,
  getBookingExpiryAt,
  getGalleryItems,
  isBusinessLive,
  normalizeBooking,
  normalizeBusiness,
} from "@/lib/platform-rules";
import {
  LIVE_BUSINESS_ID,
  categories,
  businesses,
  cities,
  initialBookings,
  initialWaitlistRequests,
} from "@/lib/seed-data";
import type { AuthSessionUser } from "@/lib/auth-types";
import type {
  ActivityLogEntry,
  Booking,
  BookingInput,
  BookingStatus,
  BlockedSlot,
  Business,
  BusinessStatus,
  PlatformState,
  Service,
  WaitlistRequest,
} from "@/lib/types";
import { calculateProfileCompletion, getInitials, toSlug } from "@/lib/utils";

const STORAGE_KEY = "reservee-platform-v4";

type BusinessUpdate = Partial<
  Omit<
    Business,
    "id" | "services" | "hours" | "blockedSlots" | "media" | "metrics" | "moderationHistory"
  >
>;

type ModerateBusinessInput = {
  status: BusinessStatus;
  internalNote?: string;
  businessMessage?: string;
  featuredUntil?: string | null;
  featuredRank?: number | null;
};

type WaitlistInput = Omit<WaitlistRequest, "id" | "createdAt">;

interface PlatformContextValue extends PlatformState {
  liveBusinesses: Business[];
  ownerBusiness: Business | undefined;
  createBooking: (input: BookingInput) => Booking | null;
  findBookingByReference: (referenceCode: string) => Booking | undefined;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  cancelBookingByCustomer: (referenceCode: string) => void;
  requestBookingReschedule: (referenceCode: string) => void;
  updateBusinessBasics: (businessId: string, updates: BusinessUpdate) => void;
  addService: (
    businessId: string,
    service: Omit<Service, "id" | "businessId" | "active">,
  ) => void;
  duplicateService: (businessId: string, serviceId: string) => void;
  toggleService: (businessId: string, serviceId: string) => void;
  moveService: (businessId: string, serviceId: string, direction: "up" | "down") => void;
  updateHours: (
    businessId: string,
    hourId: string,
    updates: Partial<Business["hours"][number]>,
  ) => void;
  addBlockedSlot: (
    businessId: string,
    slot: Omit<BlockedSlot, "id" | "businessId">,
  ) => void;
  addGalleryImage: (businessId: string, url: string, alt: string) => void;
  deleteGalleryImage: (businessId: string, mediaId: string) => void;
  moveGalleryImage: (
    businessId: string,
    mediaId: string,
    direction: "up" | "down",
  ) => void;
  setCoverImage: (businessId: string, mediaId: string) => void;
  moderateBusiness: (businessId: string, input: ModerateBusinessInput) => void;
  addWaitlistRequest: (input: WaitlistInput) => void;
  resetDemo: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

function hydrateBusinesses(nextBusinesses: Business[]) {
  return nextBusinesses
    .filter((business) => Boolean(business) && typeof business === "object")
    .map((business) => {
      const normalized = normalizeBusiness(business);
      return {
        ...normalized,
        profileCompletion: calculateProfileCompletion(normalized),
      };
    });
}

function hydrateBookings(nextBookings: Booking[]) {
  return nextBookings.map(normalizeBooking);
}

function buildInitialAuditLog(): ActivityLogEntry[] {
  return [
    {
      id: "audit-seed-1",
      type: "business_status_changed",
      createdAt: new Date().toISOString(),
      businessId: "biz-ruby",
      summary: "Ruby Blow Studio is waiting for admin review.",
    },
    {
      id: "audit-seed-2",
      type: "business_featured",
      createdAt: new Date().toISOString(),
      businessId: "biz-atlas",
      summary: "Atlas Barber Club is placed as a featured partner in Tunis.",
    },
    {
      id: "audit-seed-3",
      type: "booking_created",
      createdAt: new Date().toISOString(),
      bookingId: initialBookings[0]?.id,
      businessId: initialBookings[0]?.businessId,
      summary: "Initial demo bookings were loaded into the system.",
    },
  ];
}

function buildDefaultHours(businessId: string): Business["hours"] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: `${businessId}-hours-${dayOfWeek}`,
    businessId,
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: dayOfWeek === 0,
    breaks: dayOfWeek === 5 ? [{ start: "13:00", end: "14:00" }] : [],
  }));
}

function buildBusinessFromAuthUser(user: AuthSessionUser): Business {
  const businessId = user.businessProfileId ?? `biz-${user.id}`;
  const category = categories.find((item) => item.slug === user.categorySlug) ?? categories[0];
  const city = cities.find((item) => item.slug === user.citySlug) ?? cities[0];
  const businessName = user.businessName?.trim() || `${user.name} Studio`;
  const createdAt = user.createdAt ?? new Date().toISOString();

  return normalizeBusiness({
    id: businessId,
    ownerId: user.id,
    name: businessName,
    slug: toSlug(businessName),
    categoryId: category?.id ?? "cat-barbers",
    cityId: city?.id ?? "city-tunis",
    area: user.area ?? city?.name ?? "",
    address:
      user.area && city?.name ? `${user.area}, ${city.name}` : user.area ?? city?.name ?? "",
    phone: user.phone,
    whatsapp: user.phone,
    instagram: "",
    tagline: "Ajoutez vos services, vos photos et vos horaires pour passer en revue.",
    description:
      "Ce profil partenaire a ete cree a partir du nouvel espace d'inscription. Completez les visuels, les services et les politiques pour obtenir une page premium.",
    logoText: getInitials(businessName),
    coverUrl: "",
    status: user.businessStatus ?? "draft",
    profileCompletion: 0,
    audience: "unisex",
    yearsInBusiness: 0,
    bookingMode: "approval_required",
    operatingMode: "appointment_only",
    responseWindow: "Reponse sous 2 heures",
    services: [],
    hours: buildDefaultHours(businessId),
    blockedSlots: [],
    media: [],
    policies: {
      cancellationNotice: "24h notice preferred",
      lateArrivalGraceMinutes: 10,
      noShowRule: "Repeated no-shows may reduce priority on future requests.",
      hygieneNote: "",
      depositRequired: false,
      childrenAccepted: true,
      policyClarity: "clear",
    },
    trust: {
      phoneVerified: true,
      addressVerified: false,
      adminApproved: false,
      responseTimeTracked: false,
      policyClarityBadge: true,
    },
    moderationHistory: [],
    metrics: {
      profileViews: 0,
      bookingsThisWeek: 0,
      missedBookings: 0,
      busyDays: [],
      mostBookedServiceId: "",
    },
    createdAt,
  });
}

function buildSeedState(): PlatformState {
  return {
    businesses: hydrateBusinesses(businesses),
    bookings: hydrateBookings(initialBookings),
    waitlistRequests: initialWaitlistRequests,
    auditLog: buildInitialAuditLog(),
  };
}

function pushAudit(
  current: PlatformState,
  entry: Omit<ActivityLogEntry, "id" | "createdAt">,
): PlatformState {
  return {
    ...current,
    auditLog: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...entry,
      },
      ...current.auditLog,
    ].slice(0, 80),
  };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PlatformState>(buildSeedState);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PlatformState;

      if (
        !Array.isArray(parsed.businesses) ||
        !Array.isArray(parsed.bookings) ||
        !Array.isArray(parsed.waitlistRequests) ||
        !Array.isArray(parsed.auditLog)
      ) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      startTransition(() => {
        setState({
          businesses: hydrateBusinesses(parsed.businesses),
          bookings: hydrateBookings(parsed.bookings),
          waitlistRequests: parsed.waitlistRequests,
          auditLog: parsed.auditLog,
        });
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => ({
        ...current,
        businesses: hydrateBusinesses(current.businesses),
        bookings: hydrateBookings(current.bookings),
      }));
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "shop") {
      return;
    }

    const businessId = user.businessProfileId ?? `biz-${user.id}`;

    startTransition(() => {
      setState((current) => {
        if (
          current.businesses.some(
            (business) => business.id === businessId || business.ownerId === user.id,
          )
        ) {
          return current;
        }

        return {
          ...current,
          businesses: hydrateBusinesses([
            buildBusinessFromAuthUser(user),
            ...current.businesses,
          ]),
        };
      });
    });
  }, [user]);

  function updateBusiness(
    businessId: string,
    updater: (business: Business) => Business,
    auditEntry?: Omit<ActivityLogEntry, "id" | "createdAt">,
  ) {
    setState((current) => {
      const nextState = {
        ...current,
        businesses: current.businesses.map((business) => {
          if (business.id !== businessId) {
            return business;
          }

          const updated = normalizeBusiness(updater(business));
          return {
            ...updated,
            profileCompletion: calculateProfileCompletion(updated),
          };
        }),
      };

      return auditEntry ? pushAudit(nextState, auditEntry) : nextState;
    });
  }

  function updateBooking(
    bookingId: string,
    updater: (booking: Booking) => Booking,
    auditEntry?: Omit<ActivityLogEntry, "id" | "createdAt">,
  ) {
    setState((current) => {
      const nextState = {
        ...current,
        bookings: hydrateBookings(
          current.bookings.map((booking) =>
            booking.id === bookingId ? updater(booking) : booking,
          ),
        ),
      };

      return auditEntry ? pushAudit(nextState, auditEntry) : nextState;
    });
  }

  function createBooking(input: BookingInput) {
    const business = state.businesses.find((item) => item.id === input.businessId);
    const service = business?.services.find((item) => item.id === input.serviceId);

    if (!business || !service) {
      return null;
    }

    const createdAt = new Date().toISOString();
    const status: BookingStatus =
      business.bookingMode === "instant" ? "confirmed" : "pending";

    const booking: Booking = {
      id: crypto.randomUUID(),
      referenceCode: generateBookingReferenceCode(),
      businessId: input.businessId,
      serviceId: input.serviceId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerNote: input.customerNote,
      startAt: input.startAt,
      endAt: createEndAt(input.startAt, service.durationMinutes),
      status,
      source: "web",
      createdAt,
      expiresAt: status === "pending" ? getBookingExpiryAt(createdAt, input.startAt) : null,
      statusUpdatedAt: createdAt,
    };

    setState((current) =>
      pushAudit(
        {
          ...current,
          bookings: hydrateBookings([booking, ...current.bookings]),
        },
        {
          type: "booking_created",
          bookingId: booking.id,
          businessId: booking.businessId,
          summary: `Booking ${booking.referenceCode} created with ${status} status.`,
        },
      ),
    );

    return booking;
  }

  function findBookingByReference(referenceCode: string) {
    return state.bookings.find(
      (booking) => booking.referenceCode.toUpperCase() === referenceCode.toUpperCase(),
    );
  }

  function updateBookingStatus(bookingId: string, status: BookingStatus) {
    updateBooking(
      bookingId,
      (booking) => ({
        ...booking,
        status,
        statusUpdatedAt: new Date().toISOString(),
      }),
      {
        type: "booking_status_changed",
        bookingId,
        summary: `Booking status changed to ${status}.`,
      },
    );
  }

  function cancelBookingByCustomer(referenceCode: string) {
    const booking = findBookingByReference(referenceCode);

    if (!booking) {
      return;
    }

    updateBooking(
      booking.id,
      (current) => ({
        ...current,
        status: "cancelled_by_customer",
        statusUpdatedAt: new Date().toISOString(),
      }),
      {
        type: "booking_status_changed",
        bookingId: booking.id,
        businessId: booking.businessId,
        summary: `Customer cancelled booking ${booking.referenceCode}.`,
      },
    );
  }

  function requestBookingReschedule(referenceCode: string) {
    const booking = findBookingByReference(referenceCode);

    if (!booking || !canRequestReschedule(booking)) {
      return;
    }

    updateBooking(
      booking.id,
      (current) => ({
        ...current,
        rescheduleRequestedAt: new Date().toISOString(),
        customerNote: current.customerNote
          ? `${current.customerNote} | Reschedule requested`
          : "Reschedule requested",
      }),
      {
        type: "booking_reschedule_requested",
        bookingId: booking.id,
        businessId: booking.businessId,
        summary: `Customer requested a reschedule for ${booking.referenceCode}.`,
      },
    );
  }

  function updateBusinessBasics(businessId: string, updates: BusinessUpdate) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        ...updates,
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: "Business settings were updated.",
      },
    );
  }

  function addService(
    businessId: string,
    service: Omit<Service, "id" | "businessId" | "active">,
  ) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        services: [
          ...business.services,
          {
            ...service,
            id: crypto.randomUUID(),
            businessId,
            active: true,
          },
        ],
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: `Service ${service.title} was added.`,
      },
    );
  }

  function toggleService(businessId: string, serviceId: string) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        services: business.services.map((service) =>
          service.id === serviceId ? { ...service, active: !service.active } : service,
        ),
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: "A service activation state changed.",
      },
    );
  }

  function duplicateService(businessId: string, serviceId: string) {
    updateBusiness(
      businessId,
      (business) => {
        const source = business.services.find((service) => service.id === serviceId);

        if (!source) {
          return business;
        }

        return {
          ...business,
          services: [
            ...business.services,
            {
              ...source,
              id: crypto.randomUUID(),
              title: `${source.title} Copy`,
            },
          ],
        };
      },
      {
        type: "business_settings_edited",
        businessId,
        summary: "A service was duplicated.",
      },
    );
  }

  function moveService(
    businessId: string,
    serviceId: string,
    direction: "up" | "down",
  ) {
    updateBusiness(
      businessId,
      (business) => {
        const index = business.services.findIndex((service) => service.id === serviceId);

        if (index === -1) {
          return business;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= business.services.length) {
          return business;
        }

        const nextServices = [...business.services];
        const [item] = nextServices.splice(index, 1);
        nextServices.splice(targetIndex, 0, item);

        return {
          ...business,
          services: nextServices,
        };
      },
      {
        type: "business_settings_edited",
        businessId,
        summary: "Service ordering changed.",
      },
    );
  }

  function updateHours(
    businessId: string,
    hourId: string,
    updates: Partial<Business["hours"][number]>,
  ) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        hours: business.hours.map((hour) =>
          hour.id === hourId ? { ...hour, ...updates } : hour,
        ),
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: "Opening hours were updated.",
      },
    );
  }

  function addBlockedSlot(
    businessId: string,
    slot: Omit<BlockedSlot, "id" | "businessId">,
  ) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        blockedSlots: [
          ...business.blockedSlots,
          {
            ...slot,
            id: crypto.randomUUID(),
            businessId,
          },
        ],
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: "A blocked slot was added.",
      },
    );
  }

  function addGalleryImage(businessId: string, url: string, alt: string) {
    updateBusiness(
      businessId,
      (business) => {
        const galleryItems = getGalleryItems(business.media);

        if (galleryItems.length >= 8) {
          return business;
        }

        return {
          ...business,
          media: [
            ...business.media,
            {
              id: crypto.randomUUID(),
              businessId,
              type: "gallery",
              url,
              alt,
            },
          ],
        };
      },
      {
        type: "business_settings_edited",
        businessId,
        summary: "A gallery image was added.",
      },
    );
  }

  function deleteGalleryImage(businessId: string, mediaId: string) {
    updateBusiness(
      businessId,
      (business) => ({
        ...business,
        media: business.media.filter((item) => item.id !== mediaId || item.type === "cover"),
      }),
      {
        type: "business_settings_edited",
        businessId,
        summary: "A gallery image was removed.",
      },
    );
  }

  function moveGalleryImage(
    businessId: string,
    mediaId: string,
    direction: "up" | "down",
  ) {
    updateBusiness(
      businessId,
      (business) => {
        const coverItems = business.media.filter((item) => item.type === "cover");
        const galleryItems = getGalleryItems(business.media);
        const index = galleryItems.findIndex((item) => item.id === mediaId);

        if (index === -1) {
          return business;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= galleryItems.length) {
          return business;
        }

        const nextGallery = [...galleryItems];
        const [item] = nextGallery.splice(index, 1);
        nextGallery.splice(targetIndex, 0, item);

        return {
          ...business,
          media: [...coverItems, ...nextGallery],
        };
      },
      {
        type: "business_settings_edited",
        businessId,
        summary: "Gallery order changed.",
      },
    );
  }

  function setCoverImage(businessId: string, mediaId: string) {
    updateBusiness(
      businessId,
      (business) => {
        const target = business.media.find((item) => item.id === mediaId);

        if (!target) {
          return business;
        }

        return {
          ...business,
          coverUrl: target.url,
          media: business.media.map((item) =>
            item.id === mediaId ? { ...item, type: "cover" } : { ...item, type: "gallery" },
          ),
        };
      },
      {
        type: "business_settings_edited",
        businessId,
        summary: "Cover image was updated.",
      },
    );
  }

  function moderateBusiness(businessId: string, input: ModerateBusinessInput) {
    updateBusiness(
      businessId,
      (business) => {
        const featuredUntil =
          input.status === "featured"
            ? input.featuredUntil ?? formatISO(addDays(new Date(), DEFAULT_FEATURED_DAYS))
            : null;

        const nextBusiness: Business = {
          ...business,
          status: input.status,
          featuredUntil,
          featuredRank: input.status === "featured" ? input.featuredRank ?? 1 : null,
          featuredCitySlug:
            input.status === "featured"
              ? business.featuredCitySlug ??
                businesses.find((item) => item.id === business.id)?.featuredCitySlug ??
                null
              : null,
          featuredCategorySlug:
            input.status === "featured"
              ? business.featuredCategorySlug ??
                businesses.find((item) => item.id === business.id)?.featuredCategorySlug ??
                null
              : null,
          moderationHistory: [
            {
              id: crypto.randomUUID(),
              businessId,
              status: input.status,
              internalNote:
                input.internalNote ||
                (input.status === "changes_requested"
                  ? "Please improve profile quality before approval."
                  : `Status changed to ${input.status}.`),
              businessMessage:
                input.businessMessage ||
                (input.status === "changes_requested"
                  ? "Please update your photos, policies or address details."
                  : `Your profile is now ${input.status}.`),
              changedAt: new Date().toISOString(),
            },
            ...business.moderationHistory,
          ].slice(0, 12),
        };

        return nextBusiness;
      },
      {
        type:
          input.status === "featured"
            ? "business_featured"
            : "business_status_changed",
        businessId,
        summary: `Business moderation moved to ${input.status}.`,
      },
    );
  }

  function addWaitlistRequest(input: WaitlistInput) {
    const request: WaitlistRequest = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setState((current) =>
      pushAudit(
        {
          ...current,
          waitlistRequests: [request, ...current.waitlistRequests],
        },
        {
          type: "waitlist_request_created",
          businessId: request.businessId,
          summary: `A preferred-time request was created for ${request.preferredDate}.`,
        },
      ),
    );
  }

  function resetDemo() {
    const nextState = buildSeedState();
    setState(nextState);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  const liveBusinesses = state.businesses
    .filter((business) => isBusinessLive(business.status))
    .sort((left, right) => {
      const leftRank = left.featuredRank ?? 999;
      const rightRank = right.featuredRank ?? 999;
      return leftRank - rightRank;
    });
  const ownerBusiness =
    user?.role === "shop"
      ? state.businesses.find(
          (business) =>
            business.id === (user.businessProfileId ?? `biz-${user.id}`) ||
            business.ownerId === user.id,
        ) ?? state.businesses.find((business) => business.id === LIVE_BUSINESS_ID)
      : state.businesses.find((business) => business.id === LIVE_BUSINESS_ID);

  const value: PlatformContextValue = {
    ...state,
    liveBusinesses,
    ownerBusiness,
    createBooking,
    findBookingByReference,
    updateBookingStatus,
    cancelBookingByCustomer,
    requestBookingReschedule,
    updateBusinessBasics,
    addService,
    duplicateService,
    toggleService,
    moveService,
    updateHours,
    addBlockedSlot,
    addGalleryImage,
    deleteGalleryImage,
    moveGalleryImage,
    setCoverImage,
    moderateBusiness,
    addWaitlistRequest,
    resetDemo,
  };

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }

  return context;
}
