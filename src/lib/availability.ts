import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  formatISO,
  isBefore,
  set,
  startOfDay,
} from "date-fns";

import { isBookingBlocking } from "@/lib/platform-rules";
import type { Booking, Business, Service } from "@/lib/types";

const SLOT_STEP_MINUTES = 15;

function getHoursForDate(business: Business, date: Date) {
  return business.hours.find((hour) => hour.dayOfWeek === date.getDay());
}

function timeToDate(date: Date, value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return set(date, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

function overlapsBreaks(
  startAt: Date,
  endAt: Date,
  breaks?: { start: string; end: string }[],
) {
  if (!breaks?.length) {
    return false;
  }

  return breaks.some((breakWindow) =>
    areIntervalsOverlapping(
      { start: startAt, end: endAt },
      {
        start: timeToDate(startAt, breakWindow.start),
        end: timeToDate(startAt, breakWindow.end),
      },
      { inclusive: true },
    ),
  );
}

export function generateDateOptions(days = 7) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

export function generateAvailableSlots(
  business: Business,
  service: Service,
  bookings: Booking[],
  selectedDate: Date,
) {
  const hours = getHoursForDate(business, selectedDate);

  if (!hours || hours.isClosed) {
    return [];
  }

  const openingTime = timeToDate(selectedDate, hours.openTime);
  const closingTime = timeToDate(selectedDate, hours.closeTime);
  const dayBlockedSlots = business.blockedSlots.filter((slot) => {
    const blockedStart = new Date(slot.startAt);
    return (
      blockedStart.getFullYear() === selectedDate.getFullYear() &&
      blockedStart.getMonth() === selectedDate.getMonth() &&
      blockedStart.getDate() === selectedDate.getDate()
    );
  });

  const businessBookings = bookings.filter(
    (booking) =>
      booking.businessId === business.id &&
      isBookingBlocking(booking.status) &&
      new Date(booking.startAt).toDateString() === selectedDate.toDateString(),
  );

  const now = new Date();
  const slots: Date[] = [];

  for (
    let cursor = openingTime;
    !isBefore(closingTime, addMinutes(cursor, service.durationMinutes));
    cursor = addMinutes(cursor, SLOT_STEP_MINUTES)
  ) {
    const startAt = cursor;
    const endAt = addMinutes(startAt, service.durationMinutes);

    if (selectedDate.toDateString() === now.toDateString() && isBefore(startAt, now)) {
      continue;
    }

    if (overlapsBreaks(startAt, endAt, hours.breaks)) {
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
  const days = generateDateOptions(lookAheadDays);

  for (const day of days) {
    const slots = generateAvailableSlots(business, service, bookings, day);
    if (slots.length > 0) {
      return slots[0];
    }
  }

  return null;
}

export function createEndAt(startAt: string, durationMinutes: number) {
  return formatISO(addMinutes(new Date(startAt), durationMinutes));
}
