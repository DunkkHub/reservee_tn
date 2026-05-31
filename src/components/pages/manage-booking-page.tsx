"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, Clock3, MessageCircle, Search, ShieldCheck } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchApi } from "@/lib/client-api";
import { canCustomerCancel, canRequestReschedule, bookingStatusTone } from "@/lib/platform-rules";
import type { Booking, Business } from "@/lib/types";
import { formatDateTime, formatTime, statusLabel } from "@/lib/utils";

type ChallengeResponse = {
  challengeId: string;
  expiresAt: string;
  deliveryChannel: string;
  developmentCodePreview: string | null;
};

type VerifyResponse = {
  token: string;
};

export function ManageBookingLookupPage() {
  const router = useRouter();
  const { messages } = useLocale();
  const [referenceCode, setReferenceCode] = useState("");

  function handleSearch() {
    const nextCode = referenceCode.trim().toUpperCase();
    if (!nextCode) return;
    router.push(`/manage-booking/${nextCode}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="panel space-y-5 p-8">
        <Badge tone="accent">{messages.manageBooking.lookupBadge}</Badge>
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white">
            {messages.manageBooking.lookupTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
            {messages.manageBooking.lookupDescription}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input-field"
            placeholder={messages.manageBooking.exampleReference}
            value={referenceCode}
            onChange={(event) => setReferenceCode(event.target.value)}
          />
          <Button icon={<Search className="h-4 w-4" />} onClick={handleSearch}>
            {messages.manageBooking.openBooking}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ManageBookingPage({ referenceCode }: { referenceCode: string }) {
  const { businesses } = usePlatform();
  const { locale, messages } = useLocale();
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [token, setToken] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) {
      setBusiness(null);
      return;
    }

    const matchedBusiness = businesses.find((item) => item.id === booking.businessId) ?? null;
    setBusiness(matchedBusiness);
  }, [booking, businesses]);

  useEffect(() => {
    if (!booking || business) {
      return;
    }

    const currentBooking = booking;
    let cancelled = false;

    async function loadBusiness() {
      try {
        const loadedBusiness = await fetchApi<Business>(
          `/api/businesses?id=${encodeURIComponent(currentBooking.businessId)}`,
        );

        if (!cancelled) {
          setBusiness(loadedBusiness);
        }
      } catch {
        if (!cancelled) {
          setBusiness(null);
        }
      }
    }

    void loadBusiness();

    return () => {
      cancelled = true;
    };
  }, [booking, business]);

  useEffect(() => {
    if (!token) {
      setBooking(null);
      return;
    }

    let cancelled = false;

    async function loadBooking() {
      try {
        const loadedBooking = await fetchApi<Booking>(
          `/api/bookings/reference/${encodeURIComponent(referenceCode)}?token=${encodeURIComponent(token)}`,
        );

        if (!cancelled) {
          setBooking(loadedBooking);
        }
      } catch {
        if (!cancelled) {
          setError(messages.manageBooking.loadError);
        }
      }
    }

    void loadBooking();

    return () => {
      cancelled = true;
    };
  }, [messages.manageBooking.loadError, referenceCode, token]);

  const service = business?.services.find((item) => item.id === booking?.serviceId);
  const customerCanCancel = booking ? canCustomerCancel(booking) : false;
  const canReschedule = booking
    ? canRequestReschedule(booking) && !booking.rescheduleRequestedAt
    : false;

  async function requestChallenge() {
    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const nextChallenge = await fetchApi<ChallengeResponse>(
        `/api/bookings/reference/${encodeURIComponent(referenceCode)}/challenge`,
        {
          method: "POST",
          body: JSON.stringify({
            customerPhone: phone,
          }),
        },
      );

      setChallenge(nextChallenge);
      setMessage(
        nextChallenge.developmentCodePreview
          ? `${messages.manageBooking.verificationGenerated} ${nextChallenge.developmentCodePreview}`
          : messages.manageBooking.verificationSent,
      );
    } catch {
      setError(messages.manageBooking.requestCodeError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyChallenge() {
    if (!challenge) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const verified = await fetchApi<VerifyResponse>(
        `/api/bookings/reference/${encodeURIComponent(referenceCode)}/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            code: verificationCode,
          }),
        },
      );

      setToken(verified.token);
      setMessage(messages.manageBooking.bookingVerified);
    } catch {
      setError(messages.manageBooking.verificationFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function manageBooking(action: "cancel" | "requestReschedule") {
    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const updatedBooking = await fetchApi<Booking>(
        `/api/bookings/reference/${encodeURIComponent(referenceCode)}?token=${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action }),
        },
      );

      setBooking(updatedBooking);
      setMessage(
        action === "cancel"
          ? messages.manageBooking.bookingCancelled
          : messages.manageBooking.rescheduleSent,
      );
    } catch {
      setError(messages.manageBooking.updateError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="panel space-y-5 p-8">
          <Badge tone="accent">{messages.manageBooking.secureLookup}</Badge>
          <div>
            <h1 className="font-heading text-4xl font-semibold text-white">
              {messages.manageBooking.verifyTitle}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
              {messages.manageBooking.verifyDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm">
            <p className="text-[var(--color-secondary)]">
              {messages.manageBooking.referenceCode}
            </p>
            <p className="mt-2 font-semibold text-white">{referenceCode}</p>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">
              {messages.manageBooking.phoneNumberUsed}
            </span>
            <input
              className="input-field"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={messages.manageBooking.phonePlaceholder}
            />
          </label>
          {challenge ? (
            <label className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.manageBooking.verificationCode}
              </span>
              <input
                className="input-field"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder={messages.manageBooking.verificationCodePlaceholder}
              />
            </label>
          ) : null}
          {message ? (
            <div className="rounded-2xl border border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.1)] p-4 text-sm text-[var(--color-success)]">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.1)] p-4 text-sm text-[var(--color-error)]">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {!challenge ? (
              <Button disabled={!phone.trim() || isSubmitting} onClick={() => void requestChallenge()}>
                {messages.manageBooking.sendVerificationCode}
              </Button>
            ) : (
              <Button
                disabled={!verificationCode.trim() || isSubmitting}
                onClick={() => void verifyChallenge()}
              >
                {messages.manageBooking.verifyBooking}
              </Button>
            )}
            <Link
              href="/manage-booking"
              className={buttonStyles({ variant: "ghost" })}
            >
              {messages.manageBooking.tryAnotherReference}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={messages.manageBooking.bookingLoadedTitle}
        description={messages.manageBooking.bookingLoadedDescription}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="panel p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge tone={bookingStatusTone(booking.status)}>
              {statusLabel(booking.status, locale)}
            </Badge>
            <h1 className="font-heading text-4xl font-semibold text-white">
              {messages.manageBooking.pageTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
              {messages.manageBooking.pageDescription}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm">
            <p className="text-[var(--color-secondary)]">
              {messages.manageBooking.referenceCode}
            </p>
            <p className="mt-2 font-semibold text-white">{booking.referenceCode}</p>
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.1)] p-4 text-sm text-[var(--color-success)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.1)] p-4 text-sm text-[var(--color-error)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="panel grid gap-4 p-6 md:grid-cols-2">
            {[
              { label: messages.bookingFlow.business, value: business.name },
              { label: messages.bookingFlow.service, value: service?.title ?? messages.bookingFlow.service },
              { label: messages.manageBooking.dateAndTime, value: formatDateTime(booking.startAt, locale) },
              { label: messages.bookingFlow.phone, value: booking.customerPhone },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="panel space-y-4 p-6">
            <h2 className="font-heading text-2xl font-semibold text-white">
              {messages.manageBooking.selfServiceActions}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!customerCanCancel || isSubmitting}
                onClick={() => void manageBooking("cancel")}
              >
                {messages.manageBooking.cancelBooking}
              </Button>
              <Button
                variant="secondary"
                disabled={!canReschedule || isSubmitting}
                onClick={() => void manageBooking("requestReschedule")}
              >
                {messages.manageBooking.requestReschedule}
              </Button>
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ variant: "ghost" })}
              >
                <MessageCircle className="h-4 w-4" />
                {messages.manageBooking.whatsappBusiness}
              </a>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-secondary)]">
              {!customerCanCancel ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  {messages.manageBooking.cancellationUnavailable}
                </div>
              ) : null}
              {booking.rescheduleRequestedAt ? (
                <div className="rounded-2xl border border-[rgba(240,162,2,0.22)] bg-[rgba(240,162,2,0.1)] p-4 text-[var(--color-warning)]">
                  {messages.manageBooking.rescheduleRequestedOn}{" "}
                  {formatDateTime(booking.rescheduleRequestedAt, locale)}.
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
                <h2 className="font-heading text-2xl font-semibold text-white">
                  {messages.manageBooking.bookingRules}
                </h2>
                <p className="text-sm text-[var(--color-secondary)]">
                  {messages.manageBooking.bookingRulesDescription}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-secondary)]">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                {messages.manageBooking.pendingRule}
              </div>
              {booking.expiresAt ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  {messages.manageBooking.pendingExpiry} {formatTime(booking.expiresAt, locale)}
                </div>
              ) : null}
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                {messages.manageBooking.businessAddress} {business.address}
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">
                  {messages.manageBooking.needHelp}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--color-secondary)]">
              {messages.manageBooking.helpDescription}
            </p>
            <div className="mt-4">
              <Link
                href={`/business/${business.slug}`}
                className={buttonStyles({ variant: "secondary" })}
              >
                {messages.manageBooking.openBusinessPage}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
