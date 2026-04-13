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

const weekDays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const bookingTabs: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled_by_customer",
  "cancelled_by_business",
  "rejected",
  "expired",
  "no_show",
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
    <div className="panel p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function DashboardOverviewPage() {
  const { ownerBusiness, auditLog } = usePlatform();
  const bookings = useOwnerBookings();
  const waitlistRequests = useOwnerWaitlist();
  const [currentRenderDate] = useState(() => new Date());

  if (!ownerBusiness) return null;

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
        eyebrow="Business dashboard"
        title="Review today's bookings first"
        description="The owner now gets one operating surface for bookings, profile quality, trust signals and waitlist demand."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Today's bookings" value={todaysBookings.length} icon={CalendarDays} />
        <MetricCard label="Pending replies" value={pendingBookings.length} icon={Clock3} />
        <MetricCard label="Upcoming" value={upcomingBookings.length} icon={CalendarClock} />
        <MetricCard label="Waitlist" value={waitlistRequests.length} icon={MessageCircle} />
        <MetricCard label="Completion" value={`${ownerBusiness.profileCompletion}%`} icon={Star} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">Upcoming flow</h2>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">
                  Pending and confirmed bookings stay visible with quick WhatsApp follow-up.
                </p>
              </div>
              <Link href="/dashboard/bookings">
                <Button variant="secondary" size="sm">
                  Open bookings
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
                              {statusLabel(booking.status)}
                            </Badge>
                            {booking.rescheduleRequestedAt ? (
                              <Badge tone="warning">Reschedule requested</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-secondary)]">
                            {service?.title ?? "Service"} / {formatDateTime(booking.startAt)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                            Ref {booking.referenceCode}
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
                  title="No upcoming bookings yet"
                  description="Keep services active and hours accurate so more visits convert into appointments."
                  ctaLabel="Edit availability"
                  ctaHref="/dashboard/availability"
                />
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone={businessStatusTone(ownerBusiness.status)}>
                  {businessStatusLabel(ownerBusiness.status)}
                </Badge>
                {ownerBusiness.trust?.phoneVerified ? <Badge tone="success">Verified phone</Badge> : null}
                {ownerBusiness.trust?.addressVerified ? <Badge tone="success">Verified address</Badge> : null}
                {ownerBusiness.trust?.policyClarityBadge ? <Badge tone="accent">Policy clarity</Badge> : null}
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                {latestModeration?.businessMessage ??
                  "Keep trust signals complete so the profile looks premium and dependable."}
              </div>
            </div>

            <div className="panel p-5">
              <h3 className="font-heading text-2xl font-semibold text-white">Onboarding score</h3>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <span className="text-sm text-white">{item.label}</span>
                    <Badge tone={item.complete ? "success" : "warning"}>
                      {item.complete ? "Done" : "Missing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-heading text-2xl font-semibold text-white">Quick actions</h3>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/bookings", label: "Review bookings", icon: CalendarClock },
                { href: "/dashboard/services", label: "Update services", icon: Plus },
                { href: "/dashboard/gallery", label: "Improve gallery", icon: Camera },
                { href: "/dashboard/settings", label: "Update settings", icon: Settings },
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
            <h3 className="font-heading text-2xl font-semibold text-white">Recent activity</h3>
            <div className="mt-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="text-white">{entry.summary}</p>
                    <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                  Booking actions, moderation updates and profile edits will appear here.
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
  const bookings = useOwnerBookings();
  const [tab, setTab] = useState<BookingStatus>("pending");

  if (!ownerBusiness) return null;

  const visibleBookings = bookings.filter((booking) => booking.status === tab);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Bookings"
        title="Status-based booking operations"
        description="Every booking lifecycle is now explicit, including rejected, expired and customer-side cancellations."
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
            {statusLabel(status)} ({bookings.filter((booking) => booking.status === status).length})
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
                      <Badge tone={bookingStatusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
                      {booking.rescheduleRequestedAt ? <Badge tone="warning">Reschedule requested</Badge> : null}
                    </div>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {service?.title ?? "Service"} / {formatDateTime(booking.startAt)}
                    </p>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {booking.customerPhone}
                      {booking.customerNote ? ` / Note: ${booking.customerNote}` : ""}
                    </p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Reference {booking.referenceCode}
                    </p>
                    {booking.status === "pending" && booking.expiresAt ? (
                      <p className="text-xs text-[var(--color-muted)]">
                        Auto-expires at {formatTime(booking.expiresAt)}.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canBusinessConfirm(booking) ? (
                      <Button size="sm" onClick={() => updateBookingStatus(booking.id, "confirmed")}>
                        Confirm
                      </Button>
                    ) : null}
                    {canBusinessReject(booking) ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "rejected")}
                      >
                        Reject
                      </Button>
                    ) : null}
                    {booking.status === "confirmed" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "cancelled_by_business")}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    {canBusinessComplete(booking) ? (
                      <Button size="sm" onClick={() => updateBookingStatus(booking.id, "completed")}>
                        Complete
                      </Button>
                    ) : null}
                    {booking.status === "confirmed" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "no_show")}
                      >
                        No-show
                      </Button>
                    ) : null}
                    <a
                      href={`https://wa.me/${booking.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="ghost" size="sm" icon={<MessageCircle className="h-4 w-4" />}>
                        Contact
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
            title="No bookings in this status"
            description="Separate lifecycle tabs make it easier to distinguish real demand from expired requests or cancellations."
          />
        )}
      </div>
    </div>
  );
}

export function DashboardServicesPage() {
  const { ownerBusiness, addService, duplicateService, moveService, toggleService } = usePlatform();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "45",
    durationMinutes: "45",
    genderTarget: "unisex" as Audience,
  });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;

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
        eyebrow="Services"
        title="Add, duplicate, pause and reorder"
        description="Version 1 keeps service logic clean and simple: titles, prices, durations and audience."
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
                        {service.active ? "Active" : "Paused"}
                      </Badge>
                      {service.featured ? <Badge tone="accent">Featured</Badge> : null}
                    </div>
                    <p className="text-sm leading-7 text-[var(--color-secondary)]">{service.description}</p>
                    <p className="text-sm text-[var(--color-secondary)]">
                      {formatCurrency(service.price)} / {service.durationMinutes} min / {service.genderTarget}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => duplicateService(business.id, service.id)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleService(business.id, service.id)}
                    >
                      {service.active ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronUp className="h-4 w-4" />}
                      disabled={index === 0}
                      onClick={() => moveService(business.id, service.id, "up")}
                    >
                      Up
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronDown className="h-4 w-4" />}
                      disabled={index === business.services.length - 1}
                      onClick={() => moveService(business.id, service.id, "down")}
                    >
                      Down
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No services yet"
              description="Add at least a small service menu so pricing and slot generation look credible."
            />
          )}
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">Quick add</h2>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Title</span>
            <input
              className="input-field"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Description</span>
            <textarea
              className="input-field min-h-24 rounded-3xl py-3"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Price</span>
              <input
                className="input-field"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Duration</span>
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
            <span className="text-[var(--color-secondary)]">Audience</span>
            <select
              className="input-field"
              value={form.genderTarget}
              onChange={(event) =>
                setForm((current) => ({ ...current, genderTarget: event.target.value as Audience }))
              }
            >
              <option value="unisex">Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </label>
          <Button fullWidth icon={<Plus className="h-4 w-4" />} onClick={handleSubmit}>
            Add service
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardAvailabilityPage() {
  const { ownerBusiness, addBlockedSlot, updateHours } = usePlatform();
  const [blockedForm, setBlockedForm] = useState({
    date: "",
    start: "13:00",
    end: "14:00",
    reason: "Pause team",
  });

  if (!ownerBusiness) return null;
  const business = ownerBusiness;

  function addBlock() {
    if (!blockedForm.date) return;
    addBlockedSlot(business.id, {
      startAt: `${blockedForm.date}T${blockedForm.start}:00`,
      endAt: `${blockedForm.date}T${blockedForm.end}:00`,
      reason: blockedForm.reason,
    });
    setBlockedForm({ date: "", start: "13:00", end: "14:00", reason: "Pause team" });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Availability"
        title="Weekly hours and blocked times"
        description="Slot generation now depends on real business hours, breaks, blocks and existing bookings."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Weekly hours</h2>
            <div className="mt-4 space-y-3">
              {business.hours.map((hour) => (
                <div key={hour.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">{weekDays[hour.dayOfWeek]}</p>
                      {hour.breaks?.[0] ? (
                        <p className="mt-1 text-sm text-[var(--color-secondary)]">
                          Break {hour.breaks[0].start} - {hour.breaks[0].end}
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
                        Closed
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Blocked slots</h2>
            <div className="mt-4 space-y-3">
              {business.blockedSlots.length > 0 ? (
                business.blockedSlots.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="font-semibold text-white">{slot.reason}</p>
                    <p className="mt-2 text-[var(--color-secondary)]">
                      {formatDateTime(slot.startAt)} - {formatTime(slot.endAt)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="No blocked times yet"
                  description="Block lunch, holidays or private events so impossible slots never show up."
                />
              )}
            </div>
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">Block a date</h2>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Date</span>
            <input
              className="input-field"
              type="date"
              value={blockedForm.date}
              onChange={(event) => setBlockedForm((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Start</span>
              <input
                className="input-field"
                type="time"
                value={blockedForm.start}
                onChange={(event) => setBlockedForm((current) => ({ ...current, start: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">End</span>
              <input
                className="input-field"
                type="time"
                value={blockedForm.end}
                onChange={(event) => setBlockedForm((current) => ({ ...current, end: event.target.value }))}
              />
            </label>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Reason</span>
            <input
              className="input-field"
              value={blockedForm.reason}
              onChange={(event) => setBlockedForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>
          <Button fullWidth onClick={addBlock}>
            Add blocked time
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardGalleryPage() {
  const { ownerBusiness, addGalleryImage, deleteGalleryImage, moveGalleryImage, setCoverImage } =
    usePlatform();
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  if (!ownerBusiness) return null;
  const business = ownerBusiness;

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
        eyebrow="Gallery"
        title="Visual credibility for a premium listing"
        description="Gallery management now includes cover selection, ordering, deletion and image-count guidance."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {coverImage ? (
            <div className="panel overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage.url} alt={coverImage.alt} className="aspect-[16/7] w-full object-cover" />
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Current cover</p>
                  <p className="mt-2 text-sm text-white">{coverImage.alt}</p>
                </div>
                <Badge tone="accent">Hero image</Badge>
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
                        Set cover
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ChevronUp className="h-4 w-4" />}
                        disabled={index === 0}
                        onClick={() => moveGalleryImage(business.id, media.id, "up")}
                      >
                        Up
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ChevronDown className="h-4 w-4" />}
                        disabled={index === galleryItems.length - 1}
                        onClick={() => moveGalleryImage(business.id, media.id, "down")}
                      >
                        Down
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteGalleryImage(business.id, media.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Camera}
              title="No gallery uploaded yet"
              description="Add work examples and interior shots so the public profile feels finished."
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="panel space-y-4 p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Add gallery image</h2>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Image URL</span>
              <input className="input-field" value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Alt text</span>
              <input className="input-field" value={alt} onChange={(event) => setAlt(event.target.value)} />
            </label>
            <Button fullWidth icon={<ImagePlus className="h-4 w-4" />} onClick={submit}>
              Add image
            </Button>
          </div>

          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            Gallery images: {galleryItems.length}/{MAX_GALLERY_IMAGES}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardInsightsPage() {
  const { ownerBusiness, auditLog } = usePlatform();
  const bookings = useOwnerBookings();
  const waitlistRequests = useOwnerWaitlist();

  if (!ownerBusiness) return null;
  const business = ownerBusiness;

  const mostBookedService = business.services.find(
    (service) => service.id === business.metrics.mostBookedServiceId,
  );
  const recentActivity = auditLog.filter((entry) => entry.businessId === business.id).slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Insights"
        title="A light first analytics layer"
        description="Enough signal to understand demand, missed bookings and recent operating activity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Profile views" value={business.metrics.profileViews} icon={Eye} />
        <MetricCard label="Bookings this week" value={business.metrics.bookingsThisWeek} icon={CalendarDays} />
        <MetricCard label="Missed bookings" value={business.metrics.missedBookings} icon={UserRound} />
        <MetricCard label="Waitlist requests" value={waitlistRequests.length} icon={MessageCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Busy days</h2>
            <div className="mt-4 space-y-3">
              {business.metrics.busyDays.map((day, index) => (
                <div key={day}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{day}</span>
                    <span className="text-[var(--color-secondary)]">{95 - index * 14}% demand</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${95 - index * 14}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                    <p className="text-white">{entry.summary}</p>
                    <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title="No activity yet"
                  description="Booking and moderation events will appear here as the business operates."
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Status mix</h2>
            <div className="mt-4 space-y-3">
              {bookingTabs.map((status) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">{statusLabel(status)}</span>
                  <Badge tone={bookingStatusTone(status)}>
                    {bookings.filter((booking) => booking.status === status).length}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Top service</h2>
            <p className="mt-4 text-2xl font-semibold text-white">{mostBookedService?.title ?? "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSettingsPage() {
  const { ownerBusiness, updateBusinessBasics } = usePlatform();
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
        eyebrow="Settings"
        title="Business basics, policies and modes"
        description="This page controls the public trust layer: contact info, booking mode, operating mode and structured policies."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            {[
              { key: "name", label: "Business name" },
              { key: "area", label: "Area" },
              { key: "address", label: "Address" },
              { key: "phone", label: "Phone" },
              { key: "whatsapp", label: "WhatsApp" },
              { key: "instagram", label: "Instagram" },
              { key: "tagline", label: "Tagline" },
              { key: "responseWindow", label: "Response window" },
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
              <span className="text-[var(--color-secondary)]">Audience</span>
              <select
                className="input-field"
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as Audience }))}
              >
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Booking mode</span>
              <select
                className="input-field"
                value={form.bookingMode}
                onChange={(event) => setForm((current) => ({ ...current, bookingMode: event.target.value as BookingMode }))}
              >
                <option value="approval_required">Approval required</option>
                <option value="instant">Instant booking</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Operating mode</span>
              <select
                className="input-field"
                value={form.operatingMode}
                onChange={(event) => setForm((current) => ({ ...current, operatingMode: event.target.value as OperatingMode }))}
              >
                <option value="appointment_only">Appointment only</option>
                <option value="walk_ins">Walk-ins accepted</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--color-secondary)]">Description</span>
              <textarea
                className="input-field min-h-32 rounded-3xl py-3"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>

          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Cancellation notice</span>
              <input
                className="input-field"
                value={form.cancellationNotice}
                onChange={(event) => setForm((current) => ({ ...current, cancellationNotice: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Late arrival grace</span>
              <input
                className="input-field"
                value={form.lateArrivalGraceMinutes}
                onChange={(event) => setForm((current) => ({ ...current, lateArrivalGraceMinutes: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">No-show rule</span>
              <input
                className="input-field"
                value={form.noShowRule}
                onChange={(event) => setForm((current) => ({ ...current, noShowRule: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Policy clarity</span>
              <select
                className="input-field"
                value={form.policyClarity}
                onChange={(event) => setForm((current) => ({ ...current, policyClarity: event.target.value as PolicyClarity }))}
              >
                <option value="clear">Clear</option>
                <option value="needs_review">Needs review</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-[var(--color-secondary)]">Hygiene note</span>
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
              Children accepted
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)]">
              <input
                type="checkbox"
                checked={form.depositRequired}
                onChange={(event) => setForm((current) => ({ ...current, depositRequired: event.target.checked }))}
              />
              Deposit required
            </label>
          </div>

          <Button onClick={save}>Save settings</Button>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={businessStatusTone(business.status)}>{businessStatusLabel(business.status)}</Badge>
              {business.trust?.phoneVerified ? <Badge tone="success">Verified phone</Badge> : null}
              {business.trust?.addressVerified ? <Badge tone="success">Verified address</Badge> : null}
            </div>
          </div>
          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            <p>Booking mode: {bookingModeLabel(business.bookingMode)}</p>
            <p className="mt-2">Operating mode: {operatingModeLabel(business.operatingMode)}</p>
            <p className="mt-2">Policy clarity: {policyClarityLabel(business.policies.policyClarity)}</p>
            <p className="mt-2">Last review: {formatShortDate(business.moderationHistory[0]?.changedAt ?? business.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardOnboardingPage() {
  const { ownerBusiness, addGalleryImage, addService, updateBusinessBasics, updateHours } = usePlatform();
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
        eyebrow="Onboarding"
        title="Multi-step setup with completion score"
        description="Basics, visuals, services, schedule, policies and final review all sit in one structured wizard."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {checklist.map((item) => (
          <div key={item.id} className="panel p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{item.label}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-white">{item.complete ? "Complete" : "Pending"}</p>
              <Badge tone={item.complete ? "success" : "warning"}>{item.complete ? "Done" : "Action needed"}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {["Basics", "Visuals", "Services", "Schedule", "Policies", "Submit"].map((label, index) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 ${
              index <= step ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.1)]" : "border-white/8 bg-white/4"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Step {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-white">{label}</p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="panel p-6 text-sm text-[var(--color-secondary)]">
          Current status: {businessStatusLabel(business.status)} / completion {business.profileCompletion}%
        </div>
      ) : null}

      {step === 1 ? (
        <div className="panel space-y-4 p-6">
          <p className="text-sm text-[var(--color-secondary)]">
            Gallery images: {getGalleryItems(business.media).length}
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <input className="input-field" placeholder="https://..." value={galleryUrl} onChange={(event) => setGalleryUrl(event.target.value)} />
            <input className="input-field" placeholder="Alt text" value={galleryAlt} onChange={(event) => setGalleryAlt(event.target.value)} />
            <Button
              onClick={() => {
                if (!galleryUrl.trim()) return;
                addGalleryImage(business.id, galleryUrl, galleryAlt || business.name);
                setGalleryUrl("");
                setGalleryAlt("");
              }}
            >
              Add visual
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="panel space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input-field" placeholder="Service title" value={serviceForm.title} onChange={(event) => setServiceForm((current) => ({ ...current, title: event.target.value }))} />
            <input className="input-field" placeholder="Description" value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} />
            <input className="input-field" placeholder="Price" value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} />
            <input className="input-field" placeholder="Duration" value={serviceForm.durationMinutes} onChange={(event) => setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))} />
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
            Add service
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="panel space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input-field" type="time" value={bulkHours.open} onChange={(event) => setBulkHours((current) => ({ ...current, open: event.target.value }))} />
            <input className="input-field" type="time" value={bulkHours.close} onChange={(event) => setBulkHours((current) => ({ ...current, close: event.target.value }))} />
          </div>
          <Button onClick={applyHours}>Apply to open days</Button>
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
            Toggle booking mode and policy clarity
          </Button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="panel space-y-4 p-6">
          <Badge tone={business.status === "draft" || business.status === "changes_requested" ? "warning" : "success"}>
            {business.status === "draft" || business.status === "changes_requested" ? "Ready to submit" : "Already live"}
          </Badge>
          {business.status === "draft" || business.status === "changes_requested" ? (
            <Button onClick={() => updateBusinessBasics(business.id, { status: "pending_review" })}>
              Submit for review
            </Button>
          ) : (
            <div className="rounded-2xl border border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.1)] p-4 text-sm text-[var(--color-success)]">
              This demo owner profile is already live, so the onboarding flow acts as a quality checklist.
            </div>
          )}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
          Previous
        </Button>
        <Button disabled={step === 5} onClick={() => setStep((current) => Math.min(current + 1, 5))}>
          Continue
        </Button>
      </div>
    </div>
  );
}
