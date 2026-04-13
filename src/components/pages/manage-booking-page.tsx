"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Clock3, MessageCircle, Search, ShieldCheck } from "lucide-react";

import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { canCustomerCancel, canRequestReschedule, bookingStatusTone } from "@/lib/platform-rules";
import { formatDateTime, formatTime, statusLabel } from "@/lib/utils";

export function ManageBookingLookupPage() {
  const router = useRouter();
  const [referenceCode, setReferenceCode] = useState("");

  function handleSearch() {
    const nextCode = referenceCode.trim().toUpperCase();
    if (!nextCode) return;
    router.push(`/manage-booking/${nextCode}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="panel space-y-5 p-8">
        <Badge tone="accent">Manage booking</Badge>
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white">Find your booking</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
            Enter the booking reference code from the confirmation screen to cancel or request a reschedule without creating an account.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input-field"
            placeholder="Example: RB-AB12-3456"
            value={referenceCode}
            onChange={(event) => setReferenceCode(event.target.value)}
          />
          <Button icon={<Search className="h-4 w-4" />} onClick={handleSearch}>
            Open booking
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ManageBookingPage({ referenceCode }: { referenceCode: string }) {
  const { businesses, cancelBookingByCustomer, findBookingByReference, requestBookingReschedule } =
    usePlatform();
  const booking = findBookingByReference(referenceCode);
  const business = businesses.find((item) => item.id === booking?.businessId);
  const service = business?.services.find((item) => item.id === booking?.serviceId);

  if (!booking || !business) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Booking not found"
        description="The reference code does not match a current booking. Double-check the code from your confirmation screen and try again."
        ctaLabel="Try another code"
        ctaHref="/manage-booking"
      />
    );
  }

  const customerCanCancel = canCustomerCancel(booking);
  const canReschedule = canRequestReschedule(booking) && !booking.rescheduleRequestedAt;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="panel p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge tone={bookingStatusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
            <h1 className="font-heading text-4xl font-semibold text-white">Manage booking</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
              Customer-side booking management is available even without full customer accounts in version 1.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm">
            <p className="text-[var(--color-secondary)]">Reference code</p>
            <p className="mt-2 font-semibold text-white">{booking.referenceCode}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            {[
              { label: "Business", value: business.name },
              { label: "Service", value: service?.title ?? "Service" },
              { label: "Date and time", value: formatDateTime(booking.startAt) },
              { label: "Phone", value: booking.customerPhone },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="panel space-y-4 p-6">
            <h2 className="font-heading text-2xl font-semibold text-white">Self-service actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button disabled={!customerCanCancel} onClick={() => cancelBookingByCustomer(booking.referenceCode)}>
                Cancel booking
              </Button>
              <Button variant="secondary" disabled={!canReschedule} onClick={() => requestBookingReschedule(booking.referenceCode)}>
                Request reschedule
              </Button>
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="ghost" icon={<MessageCircle className="h-4 w-4" />}>
                  WhatsApp business
                </Button>
              </a>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-secondary)]">
              {!customerCanCancel ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  Cancellation is available only while the appointment is still upcoming and not already closed.
                </div>
              ) : null}
              {booking.rescheduleRequestedAt ? (
                <div className="rounded-2xl border border-[rgba(240,162,2,0.22)] bg-[rgba(240,162,2,0.1)] p-4 text-[var(--color-warning)]">
                  Reschedule requested on {formatDateTime(booking.rescheduleRequestedAt)}.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">Booking rules</h2>
                <p className="text-sm text-[var(--color-secondary)]">
                  Clear lifecycle rules make the platform feel more professional.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-secondary)]">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                Pending requests do not stay open forever. They expire automatically if the business does not answer in time.
              </div>
              {booking.expiresAt ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  Pending expiry time: {formatTime(booking.expiresAt)}
                </div>
              ) : null}
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                Business address: {business.address}
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">Need help?</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--color-secondary)]">
              If the booking is already confirmed and close to the appointment time, WhatsApp is still the fastest fallback.
            </p>
            <div className="mt-4">
              <Link href={`/business/${business.slug}`}>
                <Button variant="secondary">Open business page</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
