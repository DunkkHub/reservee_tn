"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateKey, generateDateOptions } from "@/lib/availability";
import { fetchApi } from "@/lib/client-api";
import { BOOKING_EXPIRY_HOURS } from "@/lib/platform-rules";
import type { Booking } from "@/lib/types";
import {
  bookingModeLabel,
  formatCurrency,
  formatDateTime,
  formatRelativeDay,
  formatTime,
  statusLabel,
} from "@/lib/utils";

export function BookingFlowPage({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const { liveBusinesses, createBooking } = usePlatform();
  const { direction, locale, messages } = useLocale();
  const business = liveBusinesses.find((item) => item.slug === slug);
  const requestedServiceId = searchParams.get("service") ?? "";
  const [step, setStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState(requestedServiceId);
  const [selectedDate, setSelectedDate] = useState(generateDateOptions(6)[0]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerNote: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const selectedService = business?.services.find(
    (service) => service.id === selectedServiceId,
  );
  const ForwardIcon = direction === "rtl" ? ArrowLeft : ArrowRight;
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!business || !selectedService) {
      setAvailableSlots([]);
      return;
    }

    const currentBusiness = business;
    const currentService = selectedService;
    let cancelled = false;

    async function loadSlots(silent = false) {
      try {
        if (!silent) {
          setSlotsLoading(true);
        }

        const slots = await fetchApi<string[]>(
          `/api/availability?businessId=${encodeURIComponent(currentBusiness.id)}&serviceId=${encodeURIComponent(currentService.id)}&type=slots&date=${formatDateKey(selectedDate)}`,
        );

        if (!cancelled) {
          setAvailableSlots(slots);
        }
      } catch {
        if (!cancelled) {
          if (!silent) {
            setAvailableSlots([]);
          }
        }
      } finally {
        if (!cancelled && !silent) {
          setSlotsLoading(false);
        }
      }
    }

    void loadSlots();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSlots(true);
      }
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [business, selectedDate, selectedService]);

  const summaryLabel = useMemo(() => {
    if (!selectedSlot) {
      return messages.bookingFlow.chooseSlot;
    }

    return formatDateTime(selectedSlot, locale);
  }, [locale, messages.bookingFlow.chooseSlot, selectedSlot]);

  if (!business) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={messages.bookingFlow.unavailableTitle}
        description={messages.bookingFlow.unavailableDescription}
        ctaLabel={messages.bookingFlow.backToExplore}
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
            {messages.bookingFlow.bookingPrefix}{" "}
            {statusLabel(confirmedBooking.status, locale).toLowerCase()}
          </Badge>
          <h1 className="mt-4 font-heading text-4xl font-semibold text-white">
            {messages.bookingFlow.reservationCreated}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--color-secondary)]">
            {messages.bookingFlow.successDescription}
          </p>
        </div>
        <div className="panel grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
              {messages.bookingFlow.business}
            </p>
            <p className="font-heading text-2xl font-semibold text-white">
              {business.name}
            </p>
            <p className="text-sm text-[var(--color-secondary)]">{business.address}</p>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {messages.bookingFlow.bookingReference}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {confirmedBooking.referenceCode}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {messages.bookingFlow.service}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {selectedService?.title}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {messages.bookingFlow.dateTime}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatDateTime(confirmedBooking.startAt, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {messages.bookingFlow.manageBooking}
              </p>
              <p className="mt-2 text-sm text-[var(--color-secondary)]">
                {messages.bookingFlow.manageDescription}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/manage-booking/${confirmedBooking.referenceCode}`}
            className="flex-1"
          >
            <Button fullWidth>{messages.bookingFlow.manageBookingButton}</Button>
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
              {messages.bookingFlow.contactWhatsapp}
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
    setStep((current) => Math.min(current + 1, messages.bookingFlow.steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    if (!business || !selectedService || !selectedSlot) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const booking = await createBooking({
        businessId: business.id,
        serviceId: selectedService.id,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerNote: formData.customerNote,
        startAt: selectedSlot,
      });

      if (booking) {
        setConfirmedBooking(booking);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to create booking right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-6">
        <div className="panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge tone="accent">{messages.bookingFlow.heroBadge}</Badge>
              <h1 className="mt-4 font-heading text-4xl font-semibold text-white">
                {messages.bookingFlow.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
                {messages.bookingFlow.heroDescription}
              </p>
            </div>
            <Link href={`/business/${business.slug}`}>
              <Button variant="ghost" icon={<BackIcon className="h-4 w-4" />}>
                {messages.bookingFlow.backToProfile}
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {messages.bookingFlow.steps.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl border p-4 ${
                  index <= step
                    ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.1)]"
                    : "border-white/8 bg-white/4"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {messages.bookingFlow.stepLabel} {index + 1}
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
                      {service.featured ? (
                        <Badge tone="accent">{messages.bookingFlow.featured}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                      {service.description}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                      <p className="text-[var(--color-muted)]">{messages.bookingFlow.price}</p>
                      <p className="mt-2 font-semibold text-white">
                        {formatCurrency(service.price, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                      <p className="text-[var(--color-muted)]">
                        {messages.bookingFlow.duration}
                      </p>
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
                    {formatRelativeDay(date, locale)}
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
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedSlot === slot
                        ? "border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.14)] text-[var(--color-accent)]"
                        : "border-white/8 bg-white/4 text-[var(--color-secondary)]"
                    }`}
                  >
                    {formatTime(slot, locale)}
                  </button>
                ))
              ) : slotsLoading ? (
                <div className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-[var(--color-muted)]">
                  {messages.bookingFlow.loadingTimes}
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-[var(--color-muted)]">
                  {messages.bookingFlow.noSlotsDescription}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="panel space-y-4 p-6">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.fullName}
              </span>
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
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.phoneNumber}
              </span>
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
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.optionalNote}
              </span>
              <textarea
                className="input-field min-h-28 rounded-3xl py-3"
                value={formData.customerNote}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    customerNote: event.target.value,
                  }))
                }
                placeholder={messages.bookingFlow.bookingNotePlaceholder}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="panel space-y-5 p-6">
            <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
              <h2 className="font-heading text-2xl font-semibold text-white">
                {messages.bookingFlow.reviewBooking}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  { label: messages.bookingFlow.business, value: business.name },
                  { label: messages.bookingFlow.service, value: selectedService?.title ?? "-" },
                  { label: messages.bookingFlow.dateTime, value: summaryLabel },
                  { label: messages.bookingFlow.customer, value: formData.customerName || "-" },
                  { label: messages.bookingFlow.phone, value: formData.customerPhone || "-" },
                  {
                    label: messages.bookingFlow.bookingMode,
                    value: bookingModeLabel(business.bookingMode, locale),
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
            {submitError ? (
              <div className="rounded-2xl border border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.1)] p-4 text-sm text-[var(--color-error)]">
                {submitError}
              </div>
            ) : null}
            <Button
              fullWidth
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {messages.bookingFlow.confirmBooking}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={step === 0}
            icon={<BackIcon className="h-4 w-4" />}
          >
            {messages.bookingFlow.previous}
          </Button>
          {step < messages.bookingFlow.steps.length - 1 ? (
            <Button
              onClick={goNext}
              icon={<ForwardIcon className="h-4 w-4" />}
              disabled={
                (step === 0 && !selectedServiceId) ||
                (step === 1 && !selectedSlot) ||
                (step === 2 &&
                  (!formData.customerName.trim() || !formData.customerPhone.trim()))
              }
            >
              {messages.bookingFlow.continue}
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <div className="panel space-y-4 p-5">
          <h2 className="font-heading text-2xl font-semibold text-white">
            {messages.bookingFlow.bookingSummary}
          </h2>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="font-medium text-white">{business.name}</p>
            <p className="mt-2 text-sm text-[var(--color-secondary)]">{business.address}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.service}
              </span>
              <span className="font-semibold text-white">
                {selectedService?.title ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.duration}
              </span>
              <span className="font-semibold text-white">
                {selectedService?.durationMinutes ? `${selectedService.durationMinutes} min` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">{messages.bookingFlow.price}</span>
              <span className="font-semibold text-white">
                {selectedService ? formatCurrency(selectedService.price, locale) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-secondary)]">
                {messages.bookingFlow.selectedSlot}
              </span>
              <span className="text-right font-semibold text-white">{summaryLabel}</span>
            </div>
          </div>
        </div>
        <div className="panel space-y-4 p-5 text-sm text-[var(--color-secondary)]">
          <h3 className="font-heading text-2xl font-semibold text-white">
            {messages.bookingFlow.professionalRules}
          </h3>
          <div className="flex items-start gap-3">
            <CalendarCheck2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            {messages.bookingFlow.rules[0]}
          </div>
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            {messages.bookingFlow.rules[1].replace("{hours}", String(BOOKING_EXPIRY_HOURS))}
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            {messages.bookingFlow.rules[2]}
          </div>
        </div>
      </aside>
    </div>
  );
}
