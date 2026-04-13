"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AtSign,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoMark } from "@/components/ui/logo-mark";
import { generateDateOptions } from "@/lib/availability";
import { fetchApi } from "@/lib/client-api";
import { isBusinessFeatured } from "@/lib/platform-rules";
import { categories, cities } from "@/lib/seed-data";
import {
  bookingModeLabel,
  cn,
  formatCurrency,
  formatMonthYear,
  formatRelativeDay,
  formatTime,
  operatingModeLabel,
} from "@/lib/utils";

const weekDays = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function BusinessProfilePage({ slug }: { slug: string }) {
  const { liveBusinesses, addWaitlistRequest } = usePlatform();
  const business = liveBusinesses.find((item) => item.slug === slug);
  const category = categories.find((item) => item.id === business?.categoryId);
  const city = cities.find((item) => item.id === business?.cityId);
  const [selectedServiceId, setSelectedServiceId] = useState(
    business?.services.find((service) => service.featured)?.id ??
      business?.services[0]?.id ??
      "",
  );
  const [selectedDate, setSelectedDate] = useState(generateDateOptions(6)[0]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [nextBestSlot, setNextBestSlot] = useState<string | null>(business?.nextAvailableAt ?? null);
  const [waitlist, setWaitlist] = useState({
    customerName: "",
    customerPhone: "",
    preferredTime: "17:00 - 19:00",
    note: "",
  });
  const [waitlistSent, setWaitlistSent] = useState(false);

  const selectedService = business?.services.find(
    (service) => service.id === selectedServiceId,
  );
  const activeServices = business?.services.filter((service) => service.active) ?? [];
  const startingPrice =
    activeServices.length > 0
      ? Math.min(...activeServices.map((service) => service.price))
      : 0;

  useEffect(() => {
    if (!business || !selectedService) {
      return;
    }

    const currentBusiness = business;
    const currentService = selectedService;
    let cancelled = false;

    async function loadAvailability() {
      try {
        const [slots, nextAvailableAt] = await Promise.all([
          fetchApi<string[]>(
            `/api/availability?businessId=${encodeURIComponent(currentBusiness.id)}&serviceId=${encodeURIComponent(currentService.id)}&type=slots&date=${selectedDate.toISOString().slice(0, 10)}`,
          ),
          fetchApi<string | null>(
            `/api/availability?businessId=${encodeURIComponent(currentBusiness.id)}&serviceId=${encodeURIComponent(currentService.id)}&type=next`,
          ),
        ]);

        if (!cancelled) {
          setAvailableSlots(slots);
          setNextBestSlot(nextAvailableAt);
        }
      } catch {
        if (!cancelled) {
          setAvailableSlots([]);
          setNextBestSlot(null);
        }
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [business, selectedDate, selectedService]);

  if (!business || !category || !city) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Business introuvable"
        description="Cette fiche ne semble pas live pour le moment. Retourne vers l explore pour voir les adresses verifiees actuellement disponibles."
        ctaLabel="Retour a l explore"
        ctaHref="/explore"
      />
    );
  }

  function submitWaitlist() {
    if (
      !business ||
      !selectedService ||
      !waitlist.customerName.trim() ||
      !waitlist.customerPhone.trim()
    ) {
      return;
    }

    addWaitlistRequest({
      businessId: business.id,
      serviceId: selectedService.id,
      customerName: waitlist.customerName,
      customerPhone: waitlist.customerPhone,
      preferredDate: selectedDate.toISOString(),
      preferredTime: waitlist.preferredTime,
      note: waitlist.note,
    });

    setWaitlistSent(true);
    setWaitlist({
      customerName: "",
      customerPhone: "",
      preferredTime: "17:00 - 19:00",
      note: "",
    });
  }

  return (
    <div className="space-y-8 pb-24">
      <section className="panel overflow-hidden">
        <div className="relative h-[380px] md:h-[480px]">
          <Image
            src={business.coverUrl}
            alt={business.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,17,21,0.22),rgba(15,17,21,0.58),rgba(15,17,21,0.96))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="default">{category.name}</Badge>
                  {business.trust?.phoneVerified ? <Badge tone="success">Verified phone</Badge> : null}
                  {business.trust?.addressVerified ? <Badge tone="success">Verified address</Badge> : null}
                  {business.trust?.adminApproved ? <Badge tone="accent">Admin approved</Badge> : null}
                  {isBusinessFeatured(business) ? <Badge tone="accent">Featured</Badge> : null}
                </div>
                <div className="flex items-end gap-4">
                  <LogoMark label={business.logoText} className="h-16 w-16 text-xl" />
                  <div className="space-y-2">
                    <h1 className="font-heading text-4xl font-semibold text-white md:text-5xl">
                      {business.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-base text-[var(--color-secondary)]">
                      <span>
                        {city.name}, {business.area}
                      </span>
                      <span className="text-white/30">•</span>
                      <span>{business.responseWindow}</span>
                      <span className="text-white/30">•</span>
                      <span>{bookingModeLabel(business.bookingMode)}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Starting price
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatCurrency(startingPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Next available
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {nextBestSlot
                        ? `${formatRelativeDay(nextBestSlot)} • ${formatTime(nextBestSlot)}`
                        : "Full right now"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      Operating mode
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {operatingModeLabel(business.operatingMode)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="panel space-y-3 p-4 backdrop-blur-md">
                <Link
                  href={`/book/${business.slug}${selectedServiceId ? `?service=${selectedServiceId}` : ""}`}
                >
                  <Button fullWidth size="lg">
                    Book now
                  </Button>
                </Link>
                <a
                  href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="secondary"
                    fullWidth
                    size="lg"
                    icon={<MessageCircle className="h-4 w-4" />}
                  >
                    WhatsApp
                  </Button>
                </a>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                  Main action on this page is to book. If you are still deciding, WhatsApp is the soft fallback.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-8">
          <div className="panel grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-[var(--color-secondary)]">
                <MapPin className="h-4 w-4 text-[var(--color-accent)]" />
                {business.address}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-secondary)]">
                <Phone className="h-4 w-4 text-[var(--color-accent)]" />
                {business.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-secondary)]">
                <AtSign className="h-4 w-4 text-[var(--color-accent)]" />
                {business.instagram}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Joined", value: formatMonthYear(business.createdAt) },
                { label: "Profile completion", value: `${business.profileCompletion}%` },
                { label: "Audience", value: business.audience },
                { label: "Years in business", value: `${business.yearsInBusiness}+` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/6 bg-white/4 p-3"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-3xl font-semibold text-white">Services</h2>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">
                  Clear services, durations, prices and one tap selection.
                </p>
              </div>
              <Badge tone="default">{activeServices.length} services</Badge>
            </div>
            <div className="grid gap-4">
              {activeServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={cn(
                    "panel flex flex-col gap-4 p-5 text-left transition md:flex-row md:items-center md:justify-between",
                    service.id === selectedServiceId &&
                      "border-[rgba(200,169,107,0.32)] bg-[rgba(200,169,107,0.08)]",
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-xl font-semibold text-white">
                        {service.title}
                      </h3>
                      {service.featured ? <Badge tone="accent">Featured service</Badge> : null}
                    </div>
                    <p className="text-sm leading-7 text-[var(--color-secondary)]">
                      {service.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {service.durationMinutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Price
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatCurrency(service.price)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-heading text-3xl font-semibold text-white">Gallery</h2>
              <p className="mt-2 text-sm text-[var(--color-secondary)]">
                Clean interiors and work examples make the listing feel credible before the first booking.
              </p>
            </div>
            {business.media.slice(1).length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {business.media.slice(1).map((media) => (
                  <div key={media.id} className="panel relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={media.url}
                      alt={media.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No gallery yet"
                description="This business still needs more photos. The rest of the profile is available while visuals are being completed."
              />
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="panel space-y-4 p-5">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">About</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                  {business.description}
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: ShieldCheck,
                    text: "Phone verified, address verified, and admin approved before going live.",
                  },
                  {
                    icon: Clock3,
                    text: `Response window: ${business.responseWindow}`,
                  },
                  {
                    icon: Zap,
                    text: `${bookingModeLabel(business.bookingMode)} with ${operatingModeLabel(business.operatingMode).toLowerCase()}.`,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.text}
                      className="rounded-2xl border border-white/6 bg-white/4 p-4 text-sm text-[var(--color-secondary)]"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                        {item.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel space-y-4 p-5">
              <h2 className="font-heading text-2xl font-semibold text-white">Policies</h2>
              <div className="grid gap-3">
                {[
                  {
                    label: "Cancellation notice",
                    value: business.policies.cancellationNotice,
                  },
                  {
                    label: "Late arrival grace",
                    value: `${business.policies.lateArrivalGraceMinutes} min`,
                  },
                  {
                    label: "No-show rule",
                    value: business.policies.noShowRule,
                  },
                  {
                    label: "Children accepted",
                    value: business.policies.childrenAccepted ? "Yes" : "No",
                  },
                  {
                    label: "Deposit required",
                    value: business.policies.depositRequired ? "Yes" : "Not in V1",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/6 bg-white/4 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel space-y-4 p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">Opening hours</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {business.hours.map((hour) => (
                <div
                  key={hour.id}
                  className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 px-4 py-3 text-sm"
                >
                  <span className="text-white">{weekDays[hour.dayOfWeek]}</span>
                  <span className="text-[var(--color-secondary)]">
                    {hour.isClosed ? "Ferme" : `${hour.openTime} - ${hour.closeTime}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="panel space-y-5 p-5">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">
                  Availability
                </h2>
                <p className="text-sm text-[var(--color-secondary)]">
                  One clear action: choose service, choose date, book.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {generateDateOptions(6).map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    selectedDate.toDateString() === date.toDateString()
                      ? "border-[rgba(200,169,107,0.36)] bg-[rgba(200,169,107,0.12)] text-white"
                      : "border-white/6 bg-white/4 text-[var(--color-secondary)]",
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {formatRelativeDay(date)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {date.getDate()}/{date.getMonth() + 1}
                  </p>
                </button>
              ))}
            </div>
            <div className="rounded-3xl border border-white/8 bg-[rgba(28,34,48,0.75)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--color-secondary)]">Selected service</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {selectedService?.title ?? "Choose a service"}
                  </p>
                </div>
                {selectedService ? (
                  <Badge tone="accent">{selectedService.durationMinutes} min</Badge>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableSlots.length > 0 ? (
                  availableSlots.slice(0, 12).map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex rounded-full border border-[rgba(59,178,115,0.26)] bg-[rgba(59,178,115,0.12)] px-3 py-2 text-sm text-[var(--color-success)] transition hover:-translate-y-0.5"
                    >
                      {formatTime(slot)}
                    </span>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--color-muted)]">
                    No free slots on this day.
                  </div>
                )}
              </div>
            </div>
            <Link
              href={`/book/${business.slug}${selectedServiceId ? `?service=${selectedServiceId}` : ""}`}
            >
              <Button fullWidth size="lg">
                Continue to booking
              </Button>
            </Link>
          </div>

          <div className="panel space-y-4 p-5">
            <h3 className="font-heading text-2xl font-semibold text-white">Trust layer</h3>
            <div className="space-y-3 text-sm text-[var(--color-secondary)]">
              {[
                { icon: ShieldCheck, text: business.trust?.phoneVerified ? "Verified phone" : "Phone verification pending" },
                { icon: ShieldCheck, text: business.trust?.addressVerified ? "Verified address" : "Address verification pending" },
                { icon: CheckCircle2, text: business.trust?.adminApproved ? "Admin approved" : "Admin approval pending" },
                { icon: Clock3, text: business.responseWindow },
                { icon: Star, text: `${business.profileCompletion}% profile completeness` },
                { icon: Sparkles, text: `Joined ${formatMonthYear(business.createdAt)}` },
                {
                  icon: CheckCircle2,
                  text: business.trust?.policyClarityBadge ? "Policy clarity badge" : "Policies need review",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="rounded-2xl border border-white/6 bg-white/4 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                      {item.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {availableSlots.length === 0 && selectedService ? (
            <div className="panel space-y-4 p-5">
              <h3 className="font-heading text-2xl font-semibold text-white">
                Request preferred time
              </h3>
              <p className="text-sm leading-7 text-[var(--color-secondary)]">
                No slots available right now. Leave your preferred window so the business can follow up instead of ending the journey here.
              </p>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Full name</span>
                <input
                  className="input-field"
                  value={waitlist.customerName}
                  onChange={(event) =>
                    setWaitlist((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Phone number</span>
                <input
                  className="input-field"
                  value={waitlist.customerPhone}
                  onChange={(event) =>
                    setWaitlist((current) => ({
                      ...current,
                      customerPhone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Preferred time</span>
                <select
                  className="input-field"
                  value={waitlist.preferredTime}
                  onChange={(event) =>
                    setWaitlist((current) => ({
                      ...current,
                      preferredTime: event.target.value,
                    }))
                  }
                >
                  <option value="09:00 - 12:00">Morning</option>
                  <option value="12:00 - 15:00">Midday</option>
                  <option value="15:00 - 18:00">Afternoon</option>
                  <option value="17:00 - 19:00">Late afternoon</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Optional note</span>
                <textarea
                  className="input-field min-h-24 rounded-3xl py-3"
                  value={waitlist.note}
                  onChange={(event) =>
                    setWaitlist((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>
              <Button fullWidth onClick={submitWaitlist}>
                Request preferred time
              </Button>
              {waitlistSent ? (
                <div className="rounded-2xl border border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.1)] p-4 text-sm text-[var(--color-success)]">
                  Preferred-time request sent. The business can now follow up with you.
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[rgba(15,17,21,0.96)] px-4 py-3 backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Main action
            </p>
            <p className="text-sm font-semibold text-white">
              {selectedService?.title ?? "Choose service"}
            </p>
            <p className="text-xs text-[var(--color-secondary)]">
              {nextBestSlot
                ? `${formatRelativeDay(nextBestSlot)} • ${formatTime(nextBestSlot)}`
                : "Use waitlist or WhatsApp"}
            </p>
          </div>
          <Link
            href={`/book/${business.slug}${selectedServiceId ? `?service=${selectedServiceId}` : ""}`}
          >
            <Button>Book now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
