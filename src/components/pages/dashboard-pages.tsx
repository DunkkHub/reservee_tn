"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Eye,
  ImagePlus,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  MAX_GALLERY_IMAGES,
  bookingStatusTone,
  businessStatusLabel,
  businessStatusTone,
  canBusinessComplete,
  canBusinessConfirm,
  canBusinessReject,
  getGalleryItems,
  getOnboardingChecklist,
} from "@/lib/platform-rules";
import type { Audience, BookingStatus, BookingMode, OperatingMode, PolicyClarity } from "@/lib/types";
import {
  bookingModeLabel,
  formatCurrency,
  formatDateTime,
  formatShortDate,
  formatTime,
  operatingModeLabel,
  policyClarityLabel,
  statusLabel,
} from "@/lib/utils";

const bookingTabs: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled_by_customer",
  "cancelled_by_business",
  "no_show",
  "expired",
];

function useOwnerBookings() {
  const { ownerBusiness, bookings } = usePlatform();
  return bookings
    .filter((booking) => booking.businessId === ownerBusiness?.id)
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
}

function useOwnerWaitlist() {
  const { ownerBusiness, waitlistRequests } = usePlatform();
  return waitlistRequests
    .filter((request) => request.businessId === ownerBusiness?.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
}) {
  return (
    <div className="metric-tile interactive-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(22,116,102,0.08)] text-[var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

export function DashboardOverviewPage() {
  const { ownerBusiness, auditLog } = usePlatform();
  const { locale, messages } = useLocale();
  const bookings = useOwnerBookings();
  const waitlistRequests = useOwnerWaitlist();
  const [currentRenderDate] = useState(() => new Date());

  if (!ownerBusiness) return null;
  const dashboard = messages.dashboard;
  const businessStatus = messages.admin.statuses[ownerBusiness.status];

  const checklist = getOnboardingChecklist(ownerBusiness);
  const now = currentRenderDate.getTime();
  const today = currentRenderDate.toDateString();
  const todaysBookings = bookings.filter((booking) => new Date(booking.startAt).toDateString() === today);
  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const upcomingBookings = bookings.filter(
    (booking) =>
      new Date(booking.startAt).getTime() > now &&
      (booking.status === "pending" || booking.status === "confirmed"),
  );
  const recentActivity = auditLog.filter((entry) => entry.businessId === ownerBusiness.id).slice(0, 4);
  const latestModeration = ownerBusiness.moderationHistory[0];

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.overviewEyebrow}
        title={dashboard.overviewTitle}
        description={dashboard.overviewDescription}
      />

      <div className="stagger-children grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={dashboard.todaysBookings} value={todaysBookings.length} icon={CalendarDays} />
        <MetricCard label={dashboard.pendingReplies} value={pendingBookings.length} icon={Clock3} />
        <MetricCard label={dashboard.upcoming} value={upcomingBookings.length} icon={CalendarClock} />
        <MetricCard label={dashboard.waitlist} value={waitlistRequests.length} icon={MessageCircle} />
        <MetricCard label={dashboard.completion} value={`${ownerBusiness.profileCompletion}%`} icon={Star} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.upcomingFlow}</h2>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">
                  {dashboard.upcomingDescription}
                </p>
              </div>
              <Link href="/dashboard/bookings">
                <Button variant="secondary" size="sm">
                  {dashboard.openBookings}
                </Button>
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingBookings.length > 0 ? (
                upcomingBookings.slice(0, 5).map((booking) => {
                  const service = ownerBusiness.services.find((item) => item.id === booking.serviceId);

                  return (
                    <div key={booking.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{booking.customerName}</p>
                            <Badge tone={bookingStatusTone(booking.status)}>
                              {statusLabel(booking.status, locale)}
                            </Badge>
                            {booking.rescheduleRequestedAt ? (
                              <Badge tone="warning">{dashboard.rescheduleRequested}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-secondary)]">
                            {service?.title ?? dashboard.serviceFallback} / {formatDateTime(booking.startAt, locale)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                            {dashboard.referencePrefix} {booking.referenceCode}
                          </p>
                        </div>
                        <a
                          href={`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="ghost" size="sm" icon={<MessageCircle className="h-4 w-4" />}>
                            WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title={dashboard.noUpcomingTitle}
                  description={dashboard.noUpcomingDescription}
                  ctaLabel={dashboard.editAvailability}
                  ctaHref="/dashboard/availability"
                />
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone={businessStatusTone(ownerBusiness.status)}>
                  {businessStatus ?? businessStatusLabel(ownerBusiness.status)}
                </Badge>
                {ownerBusiness.trust?.phoneVerified ? <Badge tone="success">{messages.businessProfile.verifiedPhone}</Badge> : null}
                {ownerBusiness.trust?.addressVerified ? <Badge tone="success">{messages.businessProfile.verifiedAddress}</Badge> : null}
                {ownerBusiness.trust?.policyClarityBadge ? <Badge tone="accent">{dashboard.policyClarity}</Badge> : null}
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                {latestModeration?.businessMessage ??
                  dashboard.trustFallback}
              </div>
            </div>

            <div className="panel p-5">
              <h3 className="font-heading text-2xl font-semibold text-white">{dashboard.onboardingScore}</h3>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <span className="text-sm text-white">
                      {dashboard.checklist[item.id as keyof typeof dashboard.checklist] ?? item.label}
                    </span>
                    <Badge tone={item.complete ? "success" : "warning"}>
                      {item.complete ? dashboard.done : dashboard.missing}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-heading text-2xl font-semibold text-white">{dashboard.quickActions}</h3>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/bookings", label: dashboard.reviewBookings, icon: CalendarClock },
                { href: "/dashboard/services", label: dashboard.updateServices, icon: Plus },
                { href: "/dashboard/gallery", label: dashboard.improveGallery, icon: Camera },
                { href: "/dashboard/settings", label: dashboard.updateSettings, icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="font-heading text-2xl font-semibold text-white">{dashboard.recentActivity}</h3>
            <div className="mt-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="text-white">{entry.summary}</p>
                    <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(entry.createdAt, locale)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                  {dashboard.activityEmpty}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardBookingsPage() {
  const { ownerBusiness, updateBookingStatus } = usePlatform();
  const { locale, messages } = useLocale();
  const bookings = useOwnerBookings();
  const [tab, setTab] = useState<BookingStatus>("pending");

  if (!ownerBusiness) return null;
  const dashboard = messages.dashboard;

  const visibleBookings = bookings.filter((booking) => booking.status === tab);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.bookingsEyebrow}
        title={dashboard.bookingsTitle}
        description={dashboard.bookingsDescription}
      />

      <div className="flex flex-wrap gap-2">
        {bookingTabs.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === status
                ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                : "border border-white/10 bg-white/4 text-[var(--color-secondary)]"
            }`}
          >
            {statusLabel(status, locale)} ({bookings.filter((booking) => booking.status === status).length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleBookings.length > 0 ? (
          visibleBookings.map((booking) => {
            const service = ownerBusiness.services.find((item) => item.id === booking.serviceId);
            return (
              <div key={booking.id} className="panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-2xl font-semibold text-white">
                        {booking.customerName}
                      </h3>
                      <Badge tone={bookingStatusTone(booking.status)}>{statusLabel(booking.status, locale)}</Badge>
                      {booking.rescheduleRequestedAt ? <Badge tone="warning">{dashboard.rescheduleRequested}</Badge> : null}
                    </div>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {service?.title ?? dashboard.serviceFallback} / {formatDateTime(booking.startAt, locale)}
                    </p>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {booking.customerPhone}
                      {booking.customerNote ? ` / ${dashboard.note}: ${booking.customerNote}` : ""}
                    </p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {dashboard.reference} {booking.referenceCode}
                    </p>
                    {booking.status === "pending" && booking.expiresAt ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        {dashboard.autoExpiresAt} {formatTime(booking.expiresAt, locale)}.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canBusinessConfirm(booking) ? (
                      <Button size="sm" onClick={() => updateBookingStatus(booking.id, "confirmed")}>
                        {dashboard.confirm}
                      </Button>
                    ) : null}
                    {canBusinessReject(booking) ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "cancelled_by_business")}
                      >
                        {dashboard.decline}
                      </Button>
                    ) : null}
                    {booking.status === "confirmed" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "cancelled_by_business")}
                      >
                        {dashboard.cancel}
                      </Button>
                    ) : null}
                    {canBusinessComplete(booking) ? (
                      <Button size="sm" onClick={() => updateBookingStatus(booking.id, "completed")}>
                        {dashboard.complete}
                      </Button>
                    ) : null}
                    {booking.status === "confirmed" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "no_show")}
                      >
                        {dashboard.noShow}
                      </Button>
                    ) : null}
                    <a
                      href={`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="ghost" size="sm" icon={<MessageCircle className="h-4 w-4" />}>
                        {dashboard.contact}
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={CalendarClock}
            title={dashboard.emptyBookingsTitle}
            description={dashboard.emptyBookingsDescription}
          />
        )}
      </div>
    </div>
  );
}

export function DashboardServicesPage() {
  const { ownerBusiness, addService, duplicateService, moveService, toggleService } = usePlatform();
  const { locale, messages } = useLocale();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "45",
    durationMinutes: "45",
    genderTarget: "unisex" as Audience,
  });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  function handleSubmit() {
    if (!form.title.trim()) return;
    addService(business.id, {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      featured: false,
      genderTarget: form.genderTarget,
    });
    setForm({
      title: "",
      description: "",
      price: "45",
      durationMinutes: "45",
      genderTarget: "unisex",
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.servicesEyebrow}
        title={dashboard.servicesTitle}
        description={dashboard.servicesDescription}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {business.services.length > 0 ? (
            business.services.map((service, index) => (
              <div key={service.id} className="panel p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-2xl font-semibold text-white">{service.title}</h3>
                      <Badge tone={service.active ? "success" : "muted"}>
                        {service.active ? dashboard.active : dashboard.paused}
                      </Badge>
                      {service.featured ? <Badge tone="accent">{dashboard.featured}</Badge> : null}
                    </div>
                    <p className="text-sm leading-7 text-[var(--color-secondary)]">{service.description}</p>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {formatCurrency(service.price, locale)} / {service.durationMinutes} min / {service.genderTarget === "men" ? dashboard.men : service.genderTarget === "women" ? dashboard.women : dashboard.unisex}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => duplicateService(business.id, service.id)}
                    >
                      {dashboard.duplicate}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleService(business.id, service.id)}
                    >
                      {service.active ? dashboard.pause : dashboard.resume}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronUp className="h-4 w-4" />}
                      disabled={index === 0}
                      onClick={() => moveService(business.id, service.id, "up")}
                    >
                      {dashboard.up}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronDown className="h-4 w-4" />}
                      disabled={index === business.services.length - 1}
                      onClick={() => moveService(business.id, service.id, "down")}
                    >
                      {dashboard.down}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Sparkles}
              title={dashboard.noServicesTitle}
              description={dashboard.noServicesDescription}
            />
          )}
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.quickAdd}</h2>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{dashboard.titleField}</span>
            <input
              className="input-field"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{dashboard.descriptionField}</span>
            <textarea
              className="input-field min-h-24 rounded-3xl py-3"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.price}</span>
              <input
                className="input-field"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.duration}</span>
              <input
                className="input-field"
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, durationMinutes: event.target.value }))
                }
              />
            </label>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{dashboard.audience}</span>
            <select
              className="input-field"
              value={form.genderTarget}
              onChange={(event) =>
                setForm((current) => ({ ...current, genderTarget: event.target.value as Audience }))
              }
            >
              <option value="unisex">{dashboard.unisex}</option>
              <option value="men">{dashboard.men}</option>
              <option value="women">{dashboard.women}</option>
            </select>
          </label>
          <Button fullWidth icon={<Plus className="h-4 w-4" />} onClick={handleSubmit}>
            {dashboard.addService}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardAvailabilityPage() {
  const { ownerBusiness, addBlockedSlot, updateHours } = usePlatform();
  const { locale, messages } = useLocale();
  const [blockedForm, setBlockedForm] = useState({
    date: "",
    start: "13:00",
    end: "14:00",
    reason: "",
  });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  function addBlock() {
    if (!blockedForm.date) return;
    addBlockedSlot(business.id, {
      startAt: `${blockedForm.date}T${blockedForm.start}:00`,
      endAt: `${blockedForm.date}T${blockedForm.end}:00`,
      reason: blockedForm.reason,
    });
    setBlockedForm({ date: "", start: "13:00", end: "14:00", reason: "" });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.availabilityEyebrow}
        title={dashboard.availabilityTitle}
        description={dashboard.availabilityDescription}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.weeklyHours}</h2>
            <div className="mt-4 space-y-3">
              {business.hours.map((hour) => (
                <div key={hour.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">{messages.businessProfile.weekDays[hour.dayOfWeek]}</p>
                      {hour.breaks?.[0] ? (
                        <p className="mt-1 text-sm text-[var(--color-secondary)]">
                          {dashboard.breakLabel} {hour.breaks[0].start} - {hour.breaks[0].end}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_120px_auto] sm:items-center">
                      <input
                        className="input-field"
                        type="time"
                        value={hour.openTime}
                        disabled={hour.isClosed}
                        onChange={(event) => updateHours(business.id, hour.id, { openTime: event.target.value })}
                      />
                      <input
                        className="input-field"
                        type="time"
                        value={hour.closeTime}
                        disabled={hour.isClosed}
                        onChange={(event) => updateHours(business.id, hour.id, { closeTime: event.target.value })}
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)]">
                        <input
                          type="checkbox"
                          checked={hour.isClosed}
                          onChange={(event) => updateHours(business.id, hour.id, { isClosed: event.target.checked })}
                        />
                        {dashboard.closed}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.blockedSlots}</h2>
            <div className="mt-4 space-y-3">
              {business.blockedSlots.length > 0 ? (
                business.blockedSlots.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="font-semibold text-white">{slot.reason}</p>
                    <p className="mt-2 text-[var(--color-secondary)]">
                      {formatDateTime(slot.startAt, locale)} - {formatTime(slot.endAt, locale)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Clock3}
                  title={dashboard.noBlockedTitle}
                  description={dashboard.noBlockedDescription}
                />
              )}
            </div>
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.blockDate}</h2>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{dashboard.date}</span>
            <input
              className="input-field"
              type="date"
              value={blockedForm.date}
              onChange={(event) => setBlockedForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.start}</span>
              <input
                className="input-field"
                type="time"
                value={blockedForm.start}
                onChange={(event) => setBlockedForm((current) => ({ ...current, start: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.end}</span>
              <input
                className="input-field"
                type="time"
                value={blockedForm.end}
                onChange={(event) => setBlockedForm((current) => ({ ...current, end: event.target.value }))}
              />
            </label>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{dashboard.reason}</span>
            <input
              className="input-field"
              value={blockedForm.reason}
              onChange={(event) => setBlockedForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>
          <Button fullWidth onClick={addBlock}>
            {dashboard.addBlockedTime}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardGalleryPage() {
  const { ownerBusiness, addGalleryImage, deleteGalleryImage, moveGalleryImage, setCoverImage } =
    usePlatform();
  const { messages } = useLocale();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  const coverImage = business.media.find((item) => item.type === "cover");
  const galleryItems = getGalleryItems(business.media);

  function submit() {
    if (!url.trim()) return;
    addGalleryImage(business.id, url, alt || business.name);
    setUrl("");
    setAlt("");
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.galleryEyebrow}
        title={dashboard.galleryTitle}
        description={dashboard.galleryDescription}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {coverImage ? (
            <div className="panel overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage.url} alt={coverImage.alt} className="aspect-[16/7] w-full object-cover" />
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{dashboard.currentCover}</p>
                  <p className="mt-2 text-sm text-white">{coverImage.alt}</p>
                </div>
                <Badge tone="accent">{dashboard.heroImage}</Badge>
              </div>
            </div>
          ) : null}

          {galleryItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {galleryItems.map((media, index) => (
                <div key={media.id} className="panel overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={media.url} alt={media.alt} className="aspect-[4/5] w-full object-cover" />
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-[var(--color-secondary)]">{media.alt}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setCoverImage(business.id, media.id)}>
                        {dashboard.setCover}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ChevronUp className="h-4 w-4" />}
                        disabled={index === 0}
                        onClick={() => moveGalleryImage(business.id, media.id, "up")}
                      >
                        {dashboard.up}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ChevronDown className="h-4 w-4" />}
                        disabled={index === galleryItems.length - 1}
                        onClick={() => moveGalleryImage(business.id, media.id, "down")}
                      >
                        {dashboard.down}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteGalleryImage(business.id, media.id)}>
                        {dashboard.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Camera}
              title={dashboard.noGalleryTitle}
              description={dashboard.noGalleryDescription}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="panel space-y-4 p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.addGalleryImage}</h2>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.imageUrl}</span>
              <input className="input-field" value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.altText}</span>
              <input className="input-field" value={alt} onChange={(event) => setAlt(event.target.value)} />
            </label>
            <Button fullWidth icon={<ImagePlus className="h-4 w-4" />} onClick={submit}>
              {dashboard.addImage}
            </Button>
          </div>

          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            {dashboard.galleryImages}: {galleryItems.length}/{MAX_GALLERY_IMAGES}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardInsightsPage() {
  const { ownerBusiness, auditLog } = usePlatform();
  const { locale, messages } = useLocale();
  const bookings = useOwnerBookings();
  const waitlistRequests = useOwnerWaitlist();

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  const mostBookedService = business.services.find(
    (service) => service.id === business.metrics.mostBookedServiceId,
  );
  const recentActivity = auditLog.filter((entry) => entry.businessId === business.id).slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.insightsEyebrow}
        title={dashboard.insightsTitle}
        description={dashboard.insightsDescription}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={dashboard.profileViews} value={business.metrics.profileViews} icon={Eye} />
        <MetricCard label={dashboard.bookingsThisWeek} value={business.metrics.bookingsThisWeek} icon={CalendarDays} />
        <MetricCard label={dashboard.missedBookings} value={business.metrics.missedBookings} icon={UserRound} />
        <MetricCard label={dashboard.waitlistRequests} value={waitlistRequests.length} icon={MessageCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.busyDays}</h2>
            <div className="mt-4 space-y-3">
              {business.metrics.busyDays.map((day, index) => (
                <div key={day}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{day}</span>
                    <span className="text-[var(--color-secondary)]">{95 - index * 14}% {dashboard.demand}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${95 - index * 14}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.recentActivity}</h2>
            <div className="mt-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="text-white">{entry.summary}</p>
                    <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(entry.createdAt, locale)}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title={dashboard.noActivityTitle}
                  description={dashboard.noActivityDescription}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.statusMix}</h2>
            <div className="mt-4 space-y-3">
              {bookingTabs.map((status) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">{statusLabel(status, locale)}</span>
                  <Badge tone={bookingStatusTone(status)}>
                    {bookings.filter((booking) => booking.status === status).length}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{dashboard.topService}</h2>
            <p className="mt-4 text-2xl font-semibold text-white">{mostBookedService?.title ?? "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSettingsPage() {
  const { ownerBusiness, updateBusinessBasics } = usePlatform();
  const { locale, messages } = useLocale();
  const [form, setForm] = useState({
    name: ownerBusiness?.name ?? "",
    area: ownerBusiness?.area ?? "",
    address: ownerBusiness?.address ?? "",
    phone: ownerBusiness?.phone ?? "",
    whatsapp: ownerBusiness?.whatsapp ?? "",
    instagram: ownerBusiness?.instagram ?? "",
    tagline: ownerBusiness?.tagline ?? "",
    description: ownerBusiness?.description ?? "",
    responseWindow: ownerBusiness?.responseWindow ?? "",
    audience: ownerBusiness?.audience ?? ("unisex" as Audience),
    bookingMode: ownerBusiness?.bookingMode ?? ("approval_required" as BookingMode),
    operatingMode: ownerBusiness?.operatingMode ?? ("appointment_only" as OperatingMode),
    cancellationNotice: ownerBusiness?.policies.cancellationNotice ?? "",
    lateArrivalGraceMinutes: String(ownerBusiness?.policies.lateArrivalGraceMinutes ?? 10),
    noShowRule: ownerBusiness?.policies.noShowRule ?? "",
    hygieneNote: ownerBusiness?.policies.hygieneNote ?? "",
    policyClarity: ownerBusiness?.policies.policyClarity ?? ("clear" as PolicyClarity),
    childrenAccepted: ownerBusiness?.policies.childrenAccepted ?? true,
    depositRequired: ownerBusiness?.policies.depositRequired ?? false,
  });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  function save() {
    updateBusinessBasics(business.id, {
      name: form.name,
      area: form.area,
      address: form.address,
      phone: form.phone,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      tagline: form.tagline,
      description: form.description,
      responseWindow: form.responseWindow,
      audience: form.audience,
      bookingMode: form.bookingMode,
      operatingMode: form.operatingMode,
      policies: {
        ...business.policies,
        cancellationNotice: form.cancellationNotice,
        lateArrivalGraceMinutes: Number(form.lateArrivalGraceMinutes),
        noShowRule: form.noShowRule,
        hygieneNote: form.hygieneNote,
        policyClarity: form.policyClarity,
        childrenAccepted: form.childrenAccepted,
        depositRequired: form.depositRequired,
      },
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.settingsEyebrow}
        title={dashboard.settingsTitle}
        description={dashboard.settingsDescription}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            {[
              { key: "name", label: dashboard.businessName },
              { key: "area", label: dashboard.area },
              { key: "address", label: dashboard.address },
              { key: "phone", label: dashboard.phone },
              { key: "whatsapp", label: "WhatsApp" },
              { key: "instagram", label: "Instagram" },
              { key: "tagline", label: dashboard.tagline },
              { key: "responseWindow", label: dashboard.responseWindow },
            ].map((field) => (
              <label key={field.key} className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">{field.label}</span>
                <input
                  className="input-field"
                  value={form[field.key as keyof typeof form] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              </label>
            ))}

            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.audience}</span>
              <select
                className="input-field"
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as Audience }))}
              >
                <option value="unisex">{dashboard.unisex}</option>
                <option value="men">{dashboard.men}</option>
                <option value="women">{dashboard.women}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.bookingMode}</span>
              <select
                className="input-field"
                value={form.bookingMode}
                onChange={(event) => setForm((current) => ({ ...current, bookingMode: event.target.value as BookingMode }))}
              >
                <option value="approval_required">{bookingModeLabel("approval_required", locale)}</option>
                <option value="instant">{bookingModeLabel("instant", locale)}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.operatingMode}</span>
              <select
                className="input-field"
                value={form.operatingMode}
                onChange={(event) => setForm((current) => ({ ...current, operatingMode: event.target.value as OperatingMode }))}
              >
                <option value="appointment_only">{operatingModeLabel("appointment_only", locale)}</option>
                <option value="walk_ins">{operatingModeLabel("walk_ins", locale)}</option>
                <option value="both">{operatingModeLabel("both", locale)}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--color-secondary)]">{dashboard.descriptionField}</span>
              <textarea
                className="input-field min-h-32 rounded-3xl py-3"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>

          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.cancellationNotice}</span>
              <input
                className="input-field"
                value={form.cancellationNotice}
                onChange={(event) => setForm((current) => ({ ...current, cancellationNotice: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.lateArrivalGrace}</span>
              <input
                className="input-field"
                value={form.lateArrivalGraceMinutes}
                onChange={(event) => setForm((current) => ({ ...current, lateArrivalGraceMinutes: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.noShowRule}</span>
              <input
                className="input-field"
                value={form.noShowRule}
                onChange={(event) => setForm((current) => ({ ...current, noShowRule: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{dashboard.policyClarity}</span>
              <select
                className="input-field"
                value={form.policyClarity}
                onChange={(event) => setForm((current) => ({ ...current, policyClarity: event.target.value as PolicyClarity }))}
              >
                <option value="clear">{policyClarityLabel("clear", locale)}</option>
                <option value="needs_review">{policyClarityLabel("needs_review", locale)}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--color-secondary)]">{dashboard.hygieneNote}</span>
              <textarea
                className="input-field min-h-24 rounded-3xl py-3"
                value={form.hygieneNote}
                onChange={(event) => setForm((current) => ({ ...current, hygieneNote: event.target.value }))}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)]">
              <input
                type="checkbox"
                checked={form.childrenAccepted}
                onChange={(event) => setForm((current) => ({ ...current, childrenAccepted: event.target.checked }))}
              />
              {dashboard.childrenAccepted}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)]">
              <input
                type="checkbox"
                checked={form.depositRequired}
                onChange={(event) => setForm((current) => ({ ...current, depositRequired: event.target.checked }))}
              />
              {dashboard.depositRequired}
            </label>
          </div>

          <Button onClick={save}>{dashboard.saveSettings}</Button>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={businessStatusTone(business.status)}>{messages.admin.statuses[business.status] ?? businessStatusLabel(business.status)}</Badge>
              {business.trust?.phoneVerified ? <Badge tone="success">{messages.businessProfile.verifiedPhone}</Badge> : null}
              {business.trust?.addressVerified ? <Badge tone="success">{messages.businessProfile.verifiedAddress}</Badge> : null}
            </div>
          </div>
          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            <p>{dashboard.bookingMode}: {bookingModeLabel(business.bookingMode, locale)}</p>
            <p className="mt-2">{dashboard.operatingMode}: {operatingModeLabel(business.operatingMode, locale)}</p>
            <p className="mt-2">{dashboard.policyClarity}: {policyClarityLabel(business.policies.policyClarity, locale)}</p>
            <p className="mt-2">{dashboard.lastReview}: {formatShortDate(business.moderationHistory[0]?.changedAt ?? business.createdAt, locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardOnboardingPage() {
  const { ownerBusiness, addGalleryImage, addService, updateBusinessBasics, updateHours } = usePlatform();
  const { messages } = useLocale();
  const [step, setStep] = useState(0);
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryAlt, setGalleryAlt] = useState("");
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    price: "40",
    durationMinutes: "45",
    genderTarget: "unisex" as Audience,
  });
  const [bulkHours, setBulkHours] = useState({ open: "09:00", close: "18:00" });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;
  const dashboard = messages.dashboard;

  const checklist = getOnboardingChecklist(business);

  function applyHours() {
    business.hours.forEach((hour) => {
      if (!hour.isClosed) {
        updateHours(business.id, hour.id, { openTime: bulkHours.open, closeTime: bulkHours.close });
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={dashboard.onboardingEyebrow}
        title={dashboard.onboardingTitle}
        description={dashboard.onboardingDescription}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {checklist.map((item) => (
          <div key={item.id} className="panel p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
              {dashboard.checklist[item.id as keyof typeof dashboard.checklist] ?? item.label}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">{item.complete ? dashboard.completeLabel : dashboard.pendingLabel}</p>
              <Badge tone={item.complete ? "success" : "warning"}>{item.complete ? dashboard.done : dashboard.actionNeeded}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {dashboard.steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${
              index <= step ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.1)]" : "border-white/8 bg-white/4"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{dashboard.stepLabel} {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-white">{label}</p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="panel p-6 text-sm text-[var(--color-secondary)]">
          {dashboard.currentStatus}: {messages.admin.statuses[business.status] ?? businessStatusLabel(business.status)} / {dashboard.completion} {business.profileCompletion}%
        </div>
      ) : null}

      {step === 1 ? (
        <div className="panel space-y-4 p-6">
          <p className="text-sm text-[var(--color-secondary)]">
            {dashboard.galleryImagesShort}: {getGalleryItems(business.media).length}
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <input className="input-field" placeholder="https://..." value={galleryUrl} onChange={(event) => setGalleryUrl(event.target.value)} />
            <input className="input-field" placeholder={dashboard.altText} value={galleryAlt} onChange={(event) => setGalleryAlt(event.target.value)} />
            <Button
              onClick={() => {
                if (!galleryUrl.trim()) return;
                addGalleryImage(business.id, galleryUrl, galleryAlt || business.name);
                setGalleryUrl("");
                setGalleryAlt("");
              }}
            >
              {dashboard.addVisual}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="panel space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input-field" placeholder={dashboard.serviceTitlePlaceholder} value={serviceForm.title} onChange={(event) => setServiceForm((current) => ({ ...current, title: event.target.value }))} />
            <input className="input-field" placeholder={dashboard.descriptionField} value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} />
            <input className="input-field" placeholder={dashboard.price} value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} />
            <input className="input-field" placeholder={dashboard.duration} value={serviceForm.durationMinutes} onChange={(event) => setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))} />
          </div>
          <Button
            onClick={() => {
              if (!serviceForm.title.trim()) return;
              addService(business.id, {
                title: serviceForm.title,
                description: serviceForm.description,
                price: Number(serviceForm.price),
                durationMinutes: Number(serviceForm.durationMinutes),
                featured: false,
                genderTarget: serviceForm.genderTarget,
              });
              setServiceForm({ title: "", description: "", price: "40", durationMinutes: "45", genderTarget: "unisex" });
            }}
          >
            {dashboard.addService}
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="panel space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input-field" type="time" value={bulkHours.open} onChange={(event) => setBulkHours((current) => ({ ...current, open: event.target.value }))} />
            <input className="input-field" type="time" value={bulkHours.close} onChange={(event) => setBulkHours((current) => ({ ...current, close: event.target.value }))} />
          </div>
          <Button onClick={applyHours}>{dashboard.applyToOpenDays}</Button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="panel space-y-4 p-6">
          <Button
            onClick={() =>
              updateBusinessBasics(business.id, {
                bookingMode: business.bookingMode === "instant" ? "approval_required" : "instant",
                policies: {
                  ...business.policies,
                  policyClarity: business.policies.policyClarity === "clear" ? "needs_review" : "clear",
                },
              })
            }
          >
            {dashboard.toggleBookingPolicy}
          </Button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="panel space-y-4 p-6">
          <Badge tone={business.status === "draft" || business.status === "changes_requested" ? "warning" : "success"}>
            {business.status === "draft" || business.status === "changes_requested" ? dashboard.readyToSubmit : dashboard.alreadyLive}
          </Badge>
          {business.status === "draft" || business.status === "changes_requested" ? (
            <Button onClick={() => updateBusinessBasics(business.id, { status: "pending_review" })}>
              {dashboard.submitForReview}
            </Button>
          ) : (
            <div className="rounded-2xl border border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.1)] p-4 text-sm text-[var(--color-success)]">
              {dashboard.alreadyLiveDescription}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
          {dashboard.previous}
        </Button>
        <Button disabled={step === 5} onClick={() => setStep((current) => Math.min(current + 1, 5))}>
          {dashboard.continue}
        </Button>
      </div>
    </div>
  );
}
