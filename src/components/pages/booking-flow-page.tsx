"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { generateAvailableSlots, generateDateOptions } from "@/lib/availability";
import { BOOKING_EXPIRY_HOURS } from "@/lib/platform-rules";
import {
  bookingModeLabel,
  formatCurrency,
  formatDateTime,
  formatRelativeDay,
  formatTime,
  statusLabel,
} from "@/lib/utils";

const steps = [
  "Choose service",
  "Choose date & time",
  "Your details",
  "Review",
];

export function BookingFlowPage({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const { liveBusinesses, bookings, createBooking } = usePlatform();
  const business = liveBusinesses.find((item) => item.slug === slug);
  const requestedServiceId = searchParams.get("service") ?? "";
  const [step, setStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState(requestedServiceId);
  const [selectedDate, setSelectedDate] = useState(generateDateOptions(6)[0]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerNote: "",
  });
  const [confirmedBookingId, setConfirmedBookingId] = useState("");

  const selectedService = business?.services.find(
    (service) => service.id === selectedServiceId,
  );
  const availableSlots =
    business && selectedService
      ? generateAvailableSlots(business, selectedService, bookings, selectedDate)
      : [];
  const confirmedBooking = bookings.find((booking) => booking.id === confirmedBookingId);

  const summaryLabel = useMemo(() => {
    if (!selectedSlot) {
      return "Choose a slot";
    }

    return formatDateTime(selectedSlot);
  }, [selectedSlot]);

  if (!business) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Booking unavailable"
        description="This business is not live in the marketplace right now. Go back to explore and pick one of the verified beauty businesses currently available."
        ctaLabel="Back to explore"
        ctaHref="/explore"
      />
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="panel p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(59,178,115,0.12)] text-[var(--color-success)] transition">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <Badge tone="success" className="mt-6">
            Booking {statusLabel(confirmedBooking.status).toLowerCase()}
          </Badge>
          <h1 className="mt-4 font-heading text-4xl font-semibold text-white">
            Reservation created
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--color-secondary)]">
            Your request now has a reference code and a self-service management page. That makes the flow feel more complete even before customer accounts are added.
          </p>
        </div>
        <div className="panel grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Business
            </p>
            <p className="font-heading text-2xl font-semibold text-white">
              {business.name}
            </p>
            <p className="text-sm text-[var(--color-secondary)]">{business.address}</p>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Booking reference
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {confirmedBooking.referenceCode}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Service
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {selectedService?.title}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Date & time
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatDateTime(confirmedBooking.startAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Manage booking
              </p>
              <p className="mt-2 text-sm text-[var(--color-secondary)]">
                Use your reference to cancel or request a reschedule without needing an account.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/manage-booking/${confirmedBooking.referenceCode}`}
            className="flex-1"
          >
            <Button fullWidth>Manage booking</Button>
          </Link>
          <a
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button
              fullWidth
              variant="secondary"
              icon={<MessageCircle className="h-4 w-4" />}
            >
              Contact on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  function goNext() {
    if (step === 0 && !selectedServiceId) return;
    if (step === 1 && !selectedSlot) return;
    if (step === 2 && (!formData.customerName.trim() || !formData.customerPhone.trim())) {
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit() {
    if (!business || !selectedService || !selectedSlot) {
      return;
    }

    const booking = createBooking({
      businessId: business.id,
      serviceId: selectedService.id,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerNote: formData.customerNote,
      startAt: selectedSlot,
    });

    if (booking) {
      setConfirmedBookingId(booking.id);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-6">
        <div className="panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge tone="accent">Booking flow</Badge>
              <h1 className="mt-4 font-heading text-4xl font-semibold text-white">
                Reserve in less than 60 seconds
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
                Clear steps, reference code at the end, and a manage-booking page so the customer journey does not stop too early.
              </p>
            </div>
            <Link href={`/business/${business.slug}`}>
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to profile
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {steps.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl border p-4 ${
                  index <= step
                    ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.1)]"
                    : "border-white/8 bg-white/4"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            {business.services
              .filter((service) => service.active)
              .map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`panel flex w-full flex-col gap-4 p-5 text-left transition md:flex-row md:items-center md:justify-between ${
                    selectedServiceId === service.id
                      ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.08)]"
                      : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-2xl font-semibold text-white">
                        {service.title}
                      </h2>
                      {service.featured ? <Badge tone="accent">Featured</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                      {service.description}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                      <p className="text-[var(--color-muted)]">Price</p>
                      <p className="mt-2 font-semibold text-white">
                        {formatCurrency(service.price)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                      <p className="text-[var(--color-muted)]">Duration</p>
                      <p className="mt-2 font-semibold text-white">
                        {service.durationMinutes} min
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="panel space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {generateDateOptions(6).map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot("");
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selectedDate.toDateString() === date.toDateString()
                      ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.08)]"
                      : "border-white/8 bg-white/4"
                  }`}
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
            <div className="flex flex-wrap gap-2">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    onClick={() => setSelectedSlot(slot.toISOString())}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedSlot === slot.toISOString()
                        ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.14)] text-[var(--color-accent)]"
                        : "border-white/8 bg-white/4 text-[var(--color-secondary)]"
                    }`}
                  >
                    {formatTime(slot)}
                  </button>
                ))
              ) : (
                <div className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-[var(--color-muted)]">
                  No slots on this day. Go back to the profile to request a preferred time instead of hitting a dead end.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="panel space-y-4 p-6">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Full name</span>
              <input
                className="input-field"
                value={formData.customerName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
                placeholder="Ex: Salma Ben Youssef"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Phone number</span>
              <input
                className="input-field"
                value={formData.customerPhone}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    customerPhone: event.target.value,
                  }))
                }
                placeholder="+216 ..."
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Optional note</span>
              <textarea
                className="input-field min-h-28 rounded-3xl py-3"
                value={formData.customerNote}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    customerNote: event.target.value,
                  }))
                }
                placeholder="Any booking note for the business"
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="panel space-y-5 p-6">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
              <h2 className="font-heading text-2xl font-semibold text-white">
                Review booking
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Business", value: business.name },
                  { label: "Service", value: selectedService?.title ?? "-" },
                  { label: "Date & time", value: summaryLabel },
                  { label: "Customer", value: formData.customerName || "-" },
                  { label: "Phone", value: formData.customerPhone || "-" },
                  {
                    label: "Booking mode",
                    value: bookingModeLabel(business.bookingMode),
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button fullWidth size="lg" onClick={handleSubmit}>
              Confirm booking
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={step === 0}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={goNext}
              icon={<ArrowRight className="h-4 w-4" />}
              disabled={
                (step === 0 && !selectedServiceId) ||
                (step === 1 && !selectedSlot) ||
                (step === 2 &&
                  (!formData.customerName.trim() || !formData.customerPhone.trim()))
              }
            >
              Continue
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">
            Booking summary
          </h2>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="font-medium text-white">{business.name}</p>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">{business.address}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">Service</span>
              <span className="font-semibold text-white">
                {selectedService?.title ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">Duration</span>
              <span className="font-semibold text-white">
                {selectedService?.durationMinutes ? `${selectedService.durationMinutes} min` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">Price</span>
              <span className="font-semibold text-white">
                {selectedService ? formatCurrency(selectedService.price) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">Selected slot</span>
              <span className="text-right font-semibold text-white">{summaryLabel}</span>
            </div>
          </div>
        </div>
        <div className="panel space-y-4 p-5 text-sm text-[var(--color-secondary)]">
          <h3 className="font-heading text-2xl font-semibold text-white">Professional rules</h3>
          <div className="flex items-start gap-3">
            <CalendarCheck2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            No account is required before booking in version 1.
          </div>
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            Pending bookings auto-expire after about {BOOKING_EXPIRY_HOURS} hours or before the slot starts, so requests do not stay open forever.
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            You can still contact the business by WhatsApp after confirmation.
          </div>
        </div>
      </aside>
    </div>
  );
}
