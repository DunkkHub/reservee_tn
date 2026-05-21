import "server-only";

import type { AuthSessionUser } from "@/lib/auth-types";
import { sendNotificationSafely } from "@/lib/notifications";
import type { Booking, Business, Service } from "@/lib/types";

function buildBookingLabel(booking: Booking, business: Business, service: Service) {
  return `${service.title} at ${business.name}`;
}

export async function sendBookingCreatedNotifications(input: {
  booking: Booking;
  business: Business;
  service: Service;
  customer?: Pick<AuthSessionUser, "email"> | null;
}) {
  const bookingLabel = buildBookingLabel(input.booking, input.business, input.service);

  await Promise.all([
    sendNotificationSafely({
      channel: "sms",
      to: input.booking.customerPhone,
      message: {
        purpose: input.booking.status === "confirmed" ? "booking_confirmed" : "booking_created",
        subject: "Booking created",
        text:
          input.booking.status === "confirmed"
            ? `Your booking for ${bookingLabel} is confirmed on ${input.booking.startAt}.`
            : `Your booking request for ${bookingLabel} was received and is pending confirmation.`,
      },
    }),
    sendNotificationSafely({
      channel: "sms",
      to: input.business.phone,
      message: {
        purpose: "business_alert",
        subject: "New booking",
        text: `New booking for ${bookingLabel} on ${input.booking.startAt}. Reference ${input.booking.referenceCode}.`,
      },
    }),
    sendNotificationSafely({
      channel: "email",
      to: input.customer?.email,
      message: {
        purpose: input.booking.status === "confirmed" ? "booking_confirmed" : "booking_created",
        subject:
          input.booking.status === "confirmed"
            ? "Your Reservee booking is confirmed"
            : "Your Reservee booking request was received",
        text:
          input.booking.status === "confirmed"
            ? `Your booking for ${bookingLabel} is confirmed on ${input.booking.startAt}.`
            : `Your booking request for ${bookingLabel} was received and is pending confirmation.`,
      },
    }),
  ]);
}

export async function sendBookingConfirmedNotifications(input: {
  booking: Booking;
  business: Business;
  service: Service;
  customer?: Pick<AuthSessionUser, "email"> | null;
}) {
  const bookingLabel = buildBookingLabel(input.booking, input.business, input.service);

  await Promise.all([
    sendNotificationSafely({
      channel: "sms",
      to: input.booking.customerPhone,
      message: {
        purpose: "booking_confirmed",
        subject: "Booking confirmed",
        text: `Your booking for ${bookingLabel} is confirmed on ${input.booking.startAt}.`,
      },
    }),
    sendNotificationSafely({
      channel: "email",
      to: input.customer?.email,
      message: {
        purpose: "booking_confirmed",
        subject: "Your Reservee booking is confirmed",
        text: `Your booking for ${bookingLabel} is confirmed on ${input.booking.startAt}.`,
      },
    }),
  ]);
}

export async function sendBookingCancellationNotifications(input: {
  booking: Booking;
  business: Business;
  service: Service;
}) {
  const bookingLabel = buildBookingLabel(input.booking, input.business, input.service);

  await Promise.all([
    sendNotificationSafely({
      channel: "sms",
      to: input.booking.customerPhone,
      message: {
        purpose: "booking_cancelled",
        subject: "Booking cancelled",
        text: `Your booking for ${bookingLabel} on ${input.booking.startAt} was cancelled.`,
      },
    }),
    sendNotificationSafely({
      channel: "sms",
      to: input.business.phone,
      message: {
        purpose: "business_alert",
        subject: "Booking cancelled",
        text: `Booking ${input.booking.referenceCode} for ${bookingLabel} was cancelled.`,
      },
    }),
  ]);
}

export function buildBookingReminderPlan(input: {
  booking: Booking;
  business: Business;
  service: Service;
}) {
  return {
    bookingId: input.booking.id,
    runAt: new Date(new Date(input.booking.startAt).getTime() - 24 * 60 * 60 * 1000).toISOString(),
    channels: ["sms"] as const,
    summary: `Send a reminder for ${buildBookingLabel(input.booking, input.business, input.service)}.`,
  };
}
