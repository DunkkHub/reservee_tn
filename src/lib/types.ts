export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_business"
  | "rejected"
  | "expired"
  | "no_show";

export type BusinessStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "featured"
  | "suspended"
  | "archived";

export type Audience = "women" | "men" | "unisex";

export type MediaType = "cover" | "gallery";

export type OperatingMode = "appointment_only" | "walk_ins" | "both";

export type BookingMode = "instant" | "approval_required";

export type PolicyClarity = "clear" | "needs_review";

export type ActivityType =
  | "business_status_changed"
  | "business_featured"
  | "business_unfeatured"
  | "business_settings_edited"
  | "booking_created"
  | "booking_status_changed"
  | "booking_reschedule_requested"
  | "waitlist_request_created";

export type CategorySlug =
  | "barbers"
  | "hair-salons"
  | "beauty-centers"
  | "nail-studios"
  | "spas";

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  shortLabel: string;
  description: string;
  icon: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  heroCopy: string;
}

export interface Service {
  id: string;
  businessId: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  featured?: boolean;
  genderTarget: Audience;
}

export interface BreakWindow {
  start: string;
  end: string;
}

export interface BusinessHours {
  id: string;
  businessId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  breaks?: BreakWindow[];
}

export interface BlockedSlot {
  id: string;
  businessId: string;
  startAt: string;
  endAt: string;
  reason: string;
}

export interface MediaItem {
  id: string;
  businessId: string;
  type: MediaType;
  url: string;
  alt: string;
}

export interface BusinessPolicy {
  cancellationNotice: string;
  lateArrivalGraceMinutes: number;
  noShowRule: string;
  hygieneNote?: string;
  depositRequired: boolean;
  childrenAccepted: boolean;
  policyClarity: PolicyClarity;
}

export interface BusinessTrust {
  phoneVerified: boolean;
  addressVerified: boolean;
  adminApproved: boolean;
  responseTimeTracked: boolean;
  policyClarityBadge: boolean;
}

export interface BusinessMetrics {
  profileViews: number;
  bookingsThisWeek: number;
  missedBookings: number;
  busyDays: string[];
  mostBookedServiceId: string;
}

export interface ModerationRecord {
  id: string;
  businessId: string;
  status: BusinessStatus;
  internalNote: string;
  businessMessage: string;
  changedAt: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  categoryId: string;
  cityId: string;
  area: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  tagline: string;
  description: string;
  logoText: string;
  coverUrl: string;
  status: BusinessStatus;
  featuredUntil?: string | null;
  featuredRank?: number | null;
  featuredCitySlug?: string | null;
  featuredCategorySlug?: CategorySlug | null;
  profileCompletion: number;
  audience: Audience;
  yearsInBusiness: number;
  bookingMode: BookingMode;
  operatingMode: OperatingMode;
  featuredCopy?: string;
  responseWindow: string;
  services: Service[];
  hours: BusinessHours[];
  blockedSlots: BlockedSlot[];
  media: MediaItem[];
  policies: BusinessPolicy;
  trust: BusinessTrust;
  moderationHistory: ModerationRecord[];
  metrics: BusinessMetrics;
  createdAt: string;
}

export interface Booking {
  id: string;
  referenceCode: string;
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: "web" | "dashboard";
  createdAt: string;
  expiresAt?: string | null;
  rescheduleRequestedAt?: string | null;
  statusUpdatedAt?: string | null;
}

export interface WaitlistRequest {
  id: string;
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  createdAt: string;
  businessId?: string;
  bookingId?: string;
  summary: string;
}

export interface PlatformState {
  businesses: Business[];
  bookings: Booking[];
  waitlistRequests: WaitlistRequest[];
  auditLog: ActivityLogEntry[];
}

export interface BookingInput {
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  startAt: string;
}
