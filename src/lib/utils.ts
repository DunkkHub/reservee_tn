import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  defaultLocale,
  getAudienceLabel as getLocalizedAudienceLabel,
  getBookingModeLabel as getLocalizedBookingModeLabel,
  getBookingStatusLabel as getLocalizedBookingStatusLabel,
  getDateTimeConnector,
  getIntlLocale,
  getOperatingModeLabel as getLocalizedOperatingModeLabel,
  getPolicyClarityLabel as getLocalizedPolicyClarityLabel,
  getRelativeDayCopy,
  type AppLocale,
} from "@/lib/i18n";
import { getGalleryItems } from "@/lib/platform-rules";
import type {
  Audience,
  BookingStatus,
  Business,
  BookingMode,
  OperatingMode,
  PolicyClarity,
} from "@/lib/types";

const numberFormatters = new Map<AppLocale, Intl.NumberFormat>();
const shortDateFormatters = new Map<AppLocale, Intl.DateTimeFormat>();
const fullDateFormatters = new Map<AppLocale, Intl.DateTimeFormat>();
const timeFormatters = new Map<AppLocale, Intl.DateTimeFormat>();
const monthYearFormatters = new Map<AppLocale, Intl.DateTimeFormat>();

function getCurrencyFormatter(locale: AppLocale) {
  if (!numberFormatters.has(locale)) {
    numberFormatters.set(
      locale,
      new Intl.NumberFormat(getIntlLocale(locale), {
        style: "currency",
        currency: "TND",
        maximumFractionDigits: 0,
      }),
    );
  }

  return numberFormatters.get(locale)!;
}

function getShortDateFormatter(locale: AppLocale) {
  if (!shortDateFormatters.has(locale)) {
    shortDateFormatters.set(
      locale,
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    );
  }

  return shortDateFormatters.get(locale)!;
}

function getFullDateFormatter(locale: AppLocale) {
  if (!fullDateFormatters.has(locale)) {
    fullDateFormatters.set(
      locale,
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }

  return fullDateFormatters.get(locale)!;
}

function getTimeFormatter(locale: AppLocale) {
  if (!timeFormatters.has(locale)) {
    timeFormatters.set(
      locale,
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }

  return timeFormatters.get(locale)!;
}

function getMonthYearFormatter(locale: AppLocale) {
  if (!monthYearFormatters.has(locale)) {
    monthYearFormatters.set(
      locale,
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        month: "long",
        year: "numeric",
      }),
    );
  }

  return monthYearFormatters.get(locale)!;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale: AppLocale = defaultLocale) {
  return getCurrencyFormatter(locale).format(value).replace("TND", "DT");
}

export function formatShortDate(
  value: Date | string,
  locale: AppLocale = defaultLocale,
) {
  return getShortDateFormatter(locale).format(toDate(value));
}

export function formatFullDate(
  value: Date | string,
  locale: AppLocale = defaultLocale,
) {
  return getFullDateFormatter(locale).format(toDate(value));
}

export function formatMonthYear(
  value: Date | string,
  locale: AppLocale = defaultLocale,
) {
  return getMonthYearFormatter(locale).format(toDate(value));
}

export function formatTime(value: Date | string, locale: AppLocale = defaultLocale) {
  return getTimeFormatter(locale).format(toDate(value));
}

export function formatDateTime(
  value: Date | string,
  locale: AppLocale = defaultLocale,
) {
  const date = toDate(value);
  return `${formatFullDate(date, locale)} ${getDateTimeConnector(locale)} ${formatTime(date, locale)}`;
}

export function formatRelativeDay(
  value: Date | string,
  locale: AppLocale = defaultLocale,
) {
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
  const relativeCopy = getRelativeDayCopy(locale);

  if (diffDays === 0) {
    return relativeCopy.today;
  }

  if (diffDays === 1) {
    return relativeCopy.tomorrow;
  }

  return formatShortDate(date, locale);
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

export function statusLabel(
  status: BookingStatus,
  locale: AppLocale = defaultLocale,
) {
  return getLocalizedBookingStatusLabel(status, locale);
}

export function bookingModeLabel(
  mode: BookingMode,
  locale: AppLocale = defaultLocale,
) {
  return getLocalizedBookingModeLabel(mode, locale);
}

export function operatingModeLabel(
  mode: OperatingMode,
  locale: AppLocale = defaultLocale,
) {
  return getLocalizedOperatingModeLabel(mode, locale);
}

export function policyClarityLabel(
  clarity: PolicyClarity,
  locale: AppLocale = defaultLocale,
) {
  return getLocalizedPolicyClarityLabel(clarity, locale);
}

export function audienceLabel(
  audience: Audience,
  locale: AppLocale = defaultLocale,
) {
  return getLocalizedAudienceLabel(audience, locale);
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
