"use client";

import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { fetchApi } from "@/lib/client-api";
import { isBusinessLive, normalizeBusiness, normalizeBooking } from "@/lib/platform-rules";
import type {
  ActivityLogEntry,
  Booking,
  BookingInput,
  BookingStatus,
  BlockedSlot,
  Business,
  BusinessHours,
  BusinessStatus,
  Service,
  WaitlistRequest,
} from "@/lib/types";

type BusinessUpdate = Partial<
  Pick<
    Business,
    | "name"
    | "area"
    | "address"
    | "phone"
    | "whatsapp"
    | "instagram"
    | "tagline"
    | "description"
    | "logoText"
    | "coverUrl"
    | "status"
    | "audience"
    | "yearsInBusiness"
    | "bookingMode"
    | "operatingMode"
    | "responseWindow"
    | "trust"
    | "policies"
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

interface PlatformContextValue {
  businesses: Business[];
  bookings: Booking[];
  waitlistRequests: WaitlistRequest[];
  auditLog: ActivityLogEntry[];
  liveBusinesses: Business[];
  ownerBusiness: Business | undefined;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createBooking: (input: BookingInput) => Promise<Booking | null>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  cancelBookingByCustomer: (referenceCode: string) => Promise<void>;
  requestBookingReschedule: (referenceCode: string) => Promise<void>;
  updateBusinessBasics: (businessId: string, updates: BusinessUpdate) => Promise<void>;
  addService: (
    businessId: string,
    service: Omit<Service, "id" | "businessId" | "active">,
  ) => Promise<void>;
  duplicateService: (businessId: string, serviceId: string) => Promise<void>;
  toggleService: (businessId: string, serviceId: string) => Promise<void>;
  moveService: (
    businessId: string,
    serviceId: string,
    direction: "up" | "down",
  ) => Promise<void>;
  updateHours: (
    businessId: string,
    hourId: string,
    updates: Partial<BusinessHours>,
  ) => Promise<void>;
  addBlockedSlot: (
    businessId: string,
    slot: Omit<BlockedSlot, "id" | "businessId">,
  ) => Promise<void>;
  addGalleryImage: (businessId: string, url: string, alt: string) => Promise<void>;
  deleteGalleryImage: (businessId: string, mediaId: string) => Promise<void>;
  moveGalleryImage: (
    businessId: string,
    mediaId: string,
    direction: "up" | "down",
  ) => Promise<void>;
  setCoverImage: (businessId: string, mediaId: string) => Promise<void>;
  moderateBusiness: (businessId: string, input: ModerateBusinessInput) => Promise<void>;
  addWaitlistRequest: (input: WaitlistInput) => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

function mergeBusinesses(...groups: Business[][]) {
  const seen = new Map<string, Business>();

  for (const business of groups.flat()) {
    if (!business?.id) {
      continue;
    }

    seen.set(business.id, normalizeBusiness(business));
  }

  return [...seen.values()];
}

function findBookingId(bookings: Booking[], referenceCode: string) {
  return bookings.find(
    (booking) => booking.referenceCode.toUpperCase() === referenceCode.toUpperCase(),
  )?.id;
}

async function fetchPublicBusinessesWithRetry() {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchApi<Business[]>("/api/businesses?scope=public&limit=100");
    } catch (error) {
      lastError = error;

      if (attempt === 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 300);
        });
      }
    }
  }

  throw lastError;
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlistRequests, setWaitlistRequests] = useState<WaitlistRequest[]>([]);
  const [auditLog, setAuditLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlatformData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    setError(null);

    try {
      if (!user) {
        const publicBusinesses = await fetchPublicBusinessesWithRetry();

        startTransition(() => {
          setBusinesses(publicBusinesses.map(normalizeBusiness));
          setBookings([]);
          setWaitlistRequests([]);
          setAuditLog([]);
          setIsLoading(false);
        });
        return;
      }

      if (user.role === "customer") {
        const [publicBusinesses, customerBookings] = await Promise.all([
          fetchPublicBusinessesWithRetry(),
          fetchApi<Booking[]>("/api/bookings"),
        ]);

        startTransition(() => {
          setBusinesses(publicBusinesses.map(normalizeBusiness));
          setBookings(customerBookings.map(normalizeBooking));
          setWaitlistRequests([]);
          setAuditLog([]);
          setIsLoading(false);
        });
        return;
      }

      if (user.role === "shop") {
        const [publicBusinesses, ownerBusiness, ownerBookings, ownerWaitlist, ownerActivity] =
          await Promise.all([
            fetchPublicBusinessesWithRetry(),
            fetchApi<Business>("/api/businesses?scope=owner"),
            fetchApi<Booking[]>("/api/bookings"),
            fetchApi<WaitlistRequest[]>("/api/waitlist"),
            fetchApi<ActivityLogEntry[]>("/api/activity"),
          ]);

        startTransition(() => {
          setBusinesses(
            mergeBusinesses(publicBusinesses, ownerBusiness ? [ownerBusiness] : []),
          );
          setBookings(ownerBookings.map(normalizeBooking));
          setWaitlistRequests(ownerWaitlist);
          setAuditLog(ownerActivity);
          setIsLoading(false);
        });
        return;
      }

      const [adminBusinesses, adminBookings, adminActivity] = await Promise.all([
        fetchApi<Business[]>("/api/admin/businesses?limit=100"),
        fetchApi<Booking[]>("/api/bookings"),
        fetchApi<ActivityLogEntry[]>("/api/activity?limit=120"),
      ]);

      startTransition(() => {
        setBusinesses(adminBusinesses.map(normalizeBusiness));
        setBookings(adminBookings.map(normalizeBooking));
        setWaitlistRequests([]);
        setAuditLog(adminActivity);
        setIsLoading(false);
      });
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load platform data.";

      if (silent) {
        startTransition(() => {
          setError(message);
        });
        return;
      }

      startTransition(() => {
        setError(message);
        setBusinesses([]);
        setBookings([]);
        setWaitlistRequests([]);
        setAuditLog([]);
        setIsLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPlatformData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPlatformData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadPlatformData({ silent: true });
      }
    }, user ? 15_000 : 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadPlatformData, user]);

  const ownerBusiness =
    user?.role === "shop"
      ? businesses.find(
          (business) =>
            business.id === user.businessProfileId || business.ownerId === user.id,
        )
      : undefined;

  const liveBusinesses = businesses
    .filter((business) => isBusinessLive(business.status))
    .sort((left, right) => {
      const leftRank = left.featuredRank ?? 999;
      const rightRank = right.featuredRank ?? 999;
      return leftRank - rightRank;
    });

  async function refreshData() {
    await loadPlatformData();
  }

  async function createBooking(input: BookingInput) {
    const booking = await fetchApi<Booking>("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        source: "web",
      }),
    });

    startTransition(() => {
      setBookings((current) => [normalizeBooking(booking), ...current]);
    });

    if (user?.role === "shop" || user?.role === "admin" || user?.role === "customer") {
      await refreshData();
    }

    return booking;
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    const updatedBooking = await fetchApi<Booking>(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "updateStatus",
        status,
      }),
    });

    startTransition(() => {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? normalizeBooking(updatedBooking) : booking,
        ),
      );
    });

    await refreshData();
  }

  async function cancelBookingByCustomer(referenceCode: string) {
    const bookingId = findBookingId(bookings, referenceCode);

    if (!bookingId) {
      return;
    }

    await updateBookingStatus(bookingId, "cancelled_by_customer");
  }

  async function requestBookingReschedule(referenceCode: string) {
    const bookingId = findBookingId(bookings, referenceCode);

    if (!bookingId) {
      return;
    }

    const updatedBooking = await fetchApi<Booking>(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "requestReschedule",
      }),
    });

    startTransition(() => {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? normalizeBooking(updatedBooking) : booking,
        ),
      );
    });

    await refreshData();
  }

  async function updateBusinessBasics(businessId: string, updates: BusinessUpdate) {
    await fetchApi<Business>("/api/businesses", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        ...updates,
      }),
    });

    await refreshData();
  }

  async function addService(
    businessId: string,
    service: Omit<Service, "id" | "businessId" | "active">,
  ) {
    await fetchApi<Service>("/api/services", {
      method: "POST",
      body: JSON.stringify({
        businessId,
        title: service.title,
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes,
        genderTarget: service.genderTarget,
      }),
    });

    await refreshData();
  }

  async function duplicateService(businessId: string, serviceId: string) {
    await fetchApi<Service>("/api/services", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        serviceId,
        actionType: "duplicate",
      }),
    });

    await refreshData();
  }

  async function toggleService(businessId: string, serviceId: string) {
    await fetchApi<Service>("/api/services", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        serviceId,
        actionType: "toggle",
      }),
    });

    await refreshData();
  }

  async function moveService(
    businessId: string,
    serviceId: string,
    direction: "up" | "down",
  ) {
    await fetchApi<Service>("/api/services", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        serviceId,
        actionType: "move",
        direction,
      }),
    });

    await refreshData();
  }

  async function updateHours(
    businessId: string,
    hourId: string,
    updates: Partial<BusinessHours>,
  ) {
    const hour = businesses
      .find((business) => business.id === businessId)
      ?.hours.find((item) => item.id === hourId);

    if (!hour) {
      return;
    }

    await fetchApi<BusinessHours[]>("/api/availability", {
      method: "POST",
      body: JSON.stringify({
        businessId,
        type: "hours",
        dayOfWeek: hour.dayOfWeek,
        openTime: updates.openTime,
        closeTime: updates.closeTime,
        isClosed: updates.isClosed,
        breaks: updates.breaks,
      }),
    });

    await refreshData();
  }

  async function addBlockedSlot(
    businessId: string,
    slot: Omit<BlockedSlot, "id" | "businessId">,
  ) {
    await fetchApi<BlockedSlot>("/api/availability", {
      method: "POST",
      body: JSON.stringify({
        businessId,
        type: "blocked",
        startAt: slot.startAt,
        endAt: slot.endAt,
        reason: slot.reason,
      }),
    });

    await refreshData();
  }

  async function addGalleryImage(businessId: string, url: string, alt: string) {
    await fetchApi("/api/media", {
      method: "POST",
      body: JSON.stringify({
        businessId,
        url,
        alt,
        type: "gallery",
      }),
    });

    await refreshData();
  }

  async function deleteGalleryImage(businessId: string, mediaId: string) {
    await fetchApi(`/api/media?businessId=${encodeURIComponent(businessId)}&mediaId=${encodeURIComponent(mediaId)}`, {
      method: "DELETE",
    });

    await refreshData();
  }

  async function moveGalleryImage(
    businessId: string,
    mediaId: string,
    direction: "up" | "down",
  ) {
    await fetchApi("/api/media", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        mediaId,
        actionType: "move",
        direction,
      }),
    });

    await refreshData();
  }

  async function setCoverImage(businessId: string, mediaId: string) {
    await fetchApi("/api/media", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        mediaId,
        actionType: "setCover",
      }),
    });

    await refreshData();
  }

  async function moderateBusiness(businessId: string, input: ModerateBusinessInput) {
    await fetchApi<Business>("/api/admin/businesses", {
      method: "PATCH",
      body: JSON.stringify({
        businessId,
        ...input,
      }),
    });

    await refreshData();
  }

  async function addWaitlistRequest(input: WaitlistInput) {
    const waitlistRequest = await fetchApi<WaitlistRequest>("/api/waitlist", {
      method: "POST",
      body: JSON.stringify(input),
    });

    startTransition(() => {
      setWaitlistRequests((current) => [waitlistRequest, ...current]);
    });

    if (user?.role === "shop" || user?.role === "admin") {
      await refreshData();
    }
  }

  const value: PlatformContextValue = {
    businesses,
    bookings,
    waitlistRequests,
    auditLog,
    liveBusinesses,
    ownerBusiness,
    isLoading,
    error,
    refreshData,
    createBooking,
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
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }

  return context;
}
