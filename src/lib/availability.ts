import {
  addMinutes,
  areIntervalsOverlapping,
  isBefore,
} from "date-fns";

import {
  combineDateKeyAndTime,
  createEndAt as createEndAtValue,
  formatDateKey as formatDateKeyInTimeZone,
  getDayOfWeekForDateKey,
  getFutureDateKeys,
  isSameDateKey,
  parseDateKeyInTimeZone,
} from "@/lib/datetime";
import { isBookingBlocking } from "@/lib/platform-rules";
import { DEFAULT_TIMEZONE } from "@/lib/site";
import type { Booking, Business, Service } from "@/lib/types";

const SLOT_STEP_MINUTES = 15;

function getBusinessTimeZone(business?: Pick<Business, "timezone"> | null) {
  return business?.timezone ?? DEFAULT_TIMEZONE;
}

function getHoursForDateKey(business: Business, dateKey: string) {
  const dayOfWeek = getDayOfWeekForDateKey(dateKey, getBusinessTimeZone(business));

  if (dayOfWeek === null) {
    return null;
  }

  return business.hours.find((hour) => hour.dayOfWeek === dayOfWeek) ?? null;
}

function timeToDate(dateKey: string, value: string, timeZone: string) {
  return combineDateKeyAndTime(dateKey, value, timeZone);
}

function overlapsBreaks(
  startAt: Date,
  endAt: Date,
  dateKey: string,
  timeZone: string,
  breaks?: { start: string; end: string }[],
) {
  if (!breaks?.length) {
    return false;
  }

  return breaks.some((breakWindow) =>
    areIntervalsOverlapping(
      { start: startAt, end: endAt },
      {
        start: timeToDate(dateKey, breakWindow.start, timeZone),
        end: timeToDate(dateKey, breakWindow.end, timeZone),
      },
      { inclusive: true },
    ),
  );
}

export function generateDateOptions(
  days = 7,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return getFutureDateKeys(days, timeZone)
    .map((dateKey) => parseDateKeyInTimeZone(dateKey, timeZone))
    .filter((value): value is Date => Boolean(value));
}

export function formatDateKey(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return formatDateKeyInTimeZone(date, timeZone);
}

export function parseDateKey(
  dateKey: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  return parseDateKeyInTimeZone(dateKey, timeZone);
}

export function generateAvailableSlots(
  business: Business,
  service: Service,
  bookings: Booking[],
  selectedDate: Date,
) {
  const timeZone = getBusinessTimeZone(business);
  const selectedDateKey = formatDateKey(selectedDate, timeZone);
  const hours = getHoursForDateKey(business, selectedDateKey);

  if (!hours || hours.isClosed) {
    return [];
  }

  const openingTime = timeToDate(selectedDateKey, hours.openTime, timeZone);
  const closingTime = timeToDate(selectedDateKey, hours.closeTime, timeZone);
  const dayBlockedSlots = business.blockedSlots.filter((slot) =>
    isSameDateKey(slot.startAt, selectedDateKey, timeZone),
  );
  const businessBookings = bookings.filter(
    (booking) =>
      booking.businessId === business.id &&
      isBookingBlocking(booking.status) &&
      isSameDateKey(booking.startAt, selectedDateKey, timeZone),
  );
  const now = new Date();
  const todayKey = formatDateKey(now, timeZone);
  const slots: Date[] = [];

  for (
    let cursor = openingTime;
    !isBefore(closingTime, addMinutes(cursor, service.durationMinutes));
    cursor = addMinutes(cursor, SLOT_STEP_MINUTES)
  ) {
    const startAt = cursor;
    const endAt = addMinutes(startAt, service.durationMinutes);

    if (selectedDateKey === todayKey && isBefore(startAt, now)) {
      continue;
    }

    if (overlapsBreaks(startAt, endAt, selectedDateKey, timeZone, hours.breaks)) {
      continue;
    }

    const intersectsBlocked = dayBlockedSlots.some((slot) =>
      areIntervalsOverlapping(
        { start: startAt, end: endAt },
        { start: new Date(slot.startAt), end: new Date(slot.endAt) },
        { inclusive: true },
      ),
    );

    if (intersectsBlocked) {
      continue;
    }

    const intersectsBookings = businessBookings.some((booking) =>
      areIntervalsOverlapping(
        { start: startAt, end: endAt },
        { start: new Date(booking.startAt), end: new Date(booking.endAt) },
        { inclusive: true },
      ),
    );

    if (intersectsBookings) {
      continue;
    }

    slots.push(startAt);
  }

  return slots;
}

export function findNextAvailableSlot(
  business: Business,
  service: Service,
  bookings: Booking[],
  lookAheadDays = 14,
) {
  const days = generateDateOptions(lookAheadDays, getBusinessTimeZone(business));

  for (const day of days) {
    const slots = generateAvailableSlots(business, service, bookings, day);
    if (slots.length > 0) {
      return slots[0];
    }
  }

  return null;
}

export function createEndAt(startAt: string, durationMinutes: number) {
  return createEndAtValue(startAt, durationMinutes);
}
