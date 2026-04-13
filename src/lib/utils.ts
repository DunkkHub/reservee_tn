import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { getGalleryItems } from "@/lib/platform-rules";
import type {
  BookingStatus,
  Business,
  BookingMode,
  OperatingMode,
  PolicyClarity,
} from "@/lib/types";

const currency = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-TN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("fr-TN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("fr-TN", {
  hour: "2-digit",
  minute: "2-digit",
});

const monthYearFormatter = new Intl.DateTimeFormat("fr-TN", {
  month: "long",
  year: "numeric",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return currency.format(value).replace("TND", "DT");
}

export function formatShortDate(value: Date | string) {
  return shortDateFormatter.format(toDate(value));
}

export function formatFullDate(value: Date | string) {
  return fullDateFormatter.format(toDate(value));
}

export function formatMonthYear(value: Date | string) {
  return monthYearFormatter.format(toDate(value));
}

export function formatTime(value: Date | string) {
  return timeFormatter.format(toDate(value));
}

export function formatDateTime(value: Date | string) {
  const date = toDate(value);
  return `${formatFullDate(date)} a ${formatTime(date)}`;
}

export function formatRelativeDay(value: Date | string) {
  const date = toDate(value);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfValue = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startOfValue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Aujourd'hui";
  }

  if (diffDays === 1) {
    return "Demain";
  }

  return formatShortDate(date);
}

export function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function statusLabel(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "En attente";
    case "confirmed":
      return "Confirmee";
    case "completed":
      return "Terminee";
    case "cancelled_by_customer":
      return "Annulee client";
    case "cancelled_by_business":
      return "Annulee business";
    case "rejected":
      return "Rejetee";
    case "expired":
      return "Expiree";
    case "no_show":
      return "No-show";
    default:
      return status;
  }
}

export function bookingModeLabel(mode: BookingMode) {
  return mode === "instant" ? "Instant booking" : "Approval required";
}

export function operatingModeLabel(mode: OperatingMode) {
  switch (mode) {
    case "appointment_only":
      return "Appointment only";
    case "walk_ins":
      return "Walk-ins accepted";
    case "both":
      return "Appointment + walk-ins";
    default:
      return mode;
  }
}

export function policyClarityLabel(clarity: PolicyClarity) {
  return clarity === "clear" ? "Policy clarity" : "Policy needs review";
}

export function calculateProfileCompletion(business: Business) {
  let score = 0;

  if (business?.logoText?.trim()) score += 8;
  if (business?.coverUrl?.trim()) score += 12;
  if (getGalleryItems(Array.isArray(business?.media) ? business.media : []).length >= 4) score += 14;
  if ((business?.services ?? []).filter((service) => service?.active).length >= 5) score += 18;
  if (business?.address?.trim()) score += 10;
  if ((business?.hours ?? []).some((hour) => !hour?.isClosed)) score += 12;
  if (business?.instagram?.trim()) score += 6;
  if ((business?.description ?? "").trim().length >= 120) score += 8;
  if (business?.policies?.policyClarity === "clear") score += 6;
  if (business?.trust?.phoneVerified) score += 3;
  if (business?.trust?.addressVerified) score += 3;

  return Math.min(score, 100);
}

export function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}
