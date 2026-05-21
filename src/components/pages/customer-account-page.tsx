"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Compass, RefreshCcw, Ticket, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  bookingStatusTone,
  canCustomerCancel,
  canRequestReschedule,
} from "@/lib/platform-rules";
import { formatDateTime, statusLabel } from "@/lib/utils";

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarClock;
}) {
  return (
    <div className="panel p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function CustomerAccountPage() {
  const { user } = useAuth();
  const { locale, messages } = useLocale();
  const {
    bookings,
    businesses,
    cancelBookingByCustomer,
    requestBookingReschedule,
  } = usePlatform();

  const customerBookings = bookings
    .filter(
      (booking) =>
        normalizePhone(booking.customerPhone) === normalizePhone(user?.phone ?? ""),
    )
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  const [currentTimestamp] = useState(() => Date.now());
  const upcoming = customerBookings.filter(
    (booking) =>
      new Date(booking.startAt).getTime() >= currentTimestamp &&
      (booking.status === "pending" || booking.status === "confirmed"),
  );
  const history = customerBookings.filter(
    (booking) => !upcoming.some((upcomingBooking) => upcomingBooking.id === booking.id),
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={messages.account.eyebrow}
        title={messages.account.title}
        description={messages.account.description}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={messages.account.upcoming} value={upcoming.length} icon={CalendarClock} />
        <MetricCard
          label={messages.account.allBookings}
          value={customerBookings.length}
          icon={Ticket}
        />
        <MetricCard label={messages.account.savedPhone} value={user?.phone ?? "-"} icon={UserRound} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">
                  {messages.account.upcomingAppointments}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">
                  {messages.account.upcomingDescription}
                </p>
              </div>
              <Link
                href="/explore"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                {messages.account.bookAnother}
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcoming.length > 0 ? (
                upcoming.map((booking) => {
                  const business = businesses.find((item) => item.id === booking.businessId);
                  const service = business?.services.find(
                    (item) => item.id === booking.serviceId,
                  );

                  return (
                    <div
                      key={booking.id}
                      className="rounded-3xl border border-white/8 bg-white/4 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-2xl font-semibold text-white">
                              {business?.name ?? messages.account.businessFallback}
                            </h3>
                            <Badge tone={bookingStatusTone(booking.status)}>
                              {statusLabel(booking.status, locale)}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--color-secondary)]">
                            {service?.title ?? messages.account.serviceFallback} /{" "}
                            {formatDateTime(booking.startAt, locale)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                            {messages.account.referencePrefix} {booking.referenceCode}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canCustomerCancel(booking) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => cancelBookingByCustomer(booking.referenceCode)}
                            >
                              {messages.account.cancel}
                            </Button>
                          ) : null}
                          {canRequestReschedule(booking) ? (
                            <Button
                              size="sm"
                              icon={<RefreshCcw className="h-4 w-4" />}
                              onClick={() =>
                                requestBookingReschedule(booking.referenceCode)
                              }
                            >
                              {messages.account.requestReschedule}
                            </Button>
                          ) : null}
                          <Link
                            href={`/manage-booking/${booking.referenceCode}`}
                            className={buttonStyles({ variant: "ghost", size: "sm" })}
                          >
                            {messages.account.openDetails}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title={messages.account.noUpcomingTitle}
                  description={messages.account.noUpcomingDescription}
                  ctaLabel={messages.account.noUpcomingCta}
                  ctaHref="/explore"
                />
              )}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">
              {messages.account.bookingHistory}
            </h2>
            <div className="mt-4 space-y-3">
              {history.length > 0 ? (
                history.map((booking) => {
                  const business = businesses.find((item) => item.id === booking.businessId);
                  const service = business?.services.find(
                    (item) => item.id === booking.serviceId,
                  );

                  return (
                    <div
                      key={booking.id}
                      className="rounded-3xl border border-white/8 bg-white/4 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">
                          {business?.name ?? messages.account.businessFallback}
                        </p>
                        <Badge tone={bookingStatusTone(booking.status)}>
                          {statusLabel(booking.status, locale)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-secondary)]">
                        {service?.title ?? messages.account.serviceFallback} /{" "}
                        {formatDateTime(booking.startAt, locale)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                  {messages.account.historyEmpty}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">
              {messages.account.quickActions}
            </h2>
            <div className="mt-4 space-y-2">
              <Link
                href="/explore"
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-white"
              >
                <Compass className="h-4 w-4 text-[var(--color-accent)]" />
                {messages.account.exploreBusinesses}
              </Link>
              <Link
                href="/manage-booking"
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-white"
              >
                <CalendarClock className="h-4 w-4 text-[var(--color-accent)]" />
                {messages.account.findByReference}
              </Link>
            </div>
          </div>

          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            <p className="font-medium text-white">{messages.account.loggedInAs}</p>
            <p className="mt-2">{user?.name ?? "-"}</p>
            <p className="mt-2">{user?.email ?? "-"}</p>
            <p className="mt-2">{user?.phone ?? "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
