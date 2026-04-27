import { addDays, addMinutes, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "@/lib/site";

function toDateValue(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateKey(
  value: Date | string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return formatInTimeZone(toDateValue(value), timeZone, "yyyy-MM-dd");
}

export function parseDateKeyInTimeZone(
  dateKey: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const value = fromZonedTime(`${dateKey}T12:00:00`, timeZone);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

export function getDayOfWeekForDateKey(
  dateKey: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const parsed = parseDateKeyInTimeZone(dateKey, timeZone);

  if (!parsed) {
    return null;
  }

  return toZonedTime(parsed, timeZone).getDay();
}

export function combineDateKeyAndTime(
  dateKey: string,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return fromZonedTime(`${dateKey}T${time}:00`, timeZone);
}

export function isSameDateKey(
  value: Date | string,
  dateKey: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return formatDateKey(value, timeZone) === dateKey;
}

export function generateDateOptions(days = 7) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

export function getFutureDateKeys(
  days: number,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const todayKey = formatDateKey(new Date(), timeZone);
  const baseDate = parseDateKeyInTimeZone(todayKey, timeZone);

  if (!baseDate) {
    return [];
  }

  return Array.from({ length: days }, (_, index) =>
    formatDateKey(addDays(baseDate, index), timeZone),
  );
}

export function createEndAt(startAt: string, durationMinutes: number) {
  return addMinutes(new Date(startAt), durationMinutes).toISOString();
}

export function fromDatabaseDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value.includes("T")) {
    const normalized = value.endsWith("Z") ? value : `${value}Z`;
    return new Date(normalized).toISOString();
  }

  return new Date(value.replace(" ", "T") + "Z").toISOString();
}

export function toDatabaseDateTime(value: Date | string) {
  return formatInTimeZone(toDateValue(value), "UTC", "yyyy-MM-dd HH:mm:ss");
}
