import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, MessageCircle, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { findNextAvailableSlot } from "@/lib/availability";
import { isBusinessFeatured } from "@/lib/platform-rules";
import type { Booking, Business } from "@/lib/types";
import { bookingModeLabel, formatCurrency, formatRelativeDay, formatTime } from "@/lib/utils";

interface BusinessCardProps {
  business: Business;
  categoryName: string;
  cityName: string;
  bookings: Booking[];
  compact?: boolean;
}

export function BusinessCard({
  business,
  categoryName,
  cityName,
  bookings,
  compact,
}: BusinessCardProps) {
  const firstService = business.services.find((service) => service.active);
  const nextAvailable = firstService
    ? findNextAvailableSlot(business, firstService, bookings)
    : null;
  const startingPrice = Math.min(
    ...business.services.filter((service) => service.active).map((service) => service.price),
  );

  return (
    <article className="panel group overflow-hidden transition duration-200 hover:-translate-y-1">
      <div className="relative h-56 w-full overflow-hidden md:h-64">
        <Image
          src={business.coverUrl}
          alt={business.name}
          fill
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
          sizes={compact ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 33vw"}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(15,17,21,0.78)_78%,rgba(15,17,21,0.94)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone={isBusinessFeatured(business) ? "accent" : "default"}>
              {isBusinessFeatured(business)
                ? "Featured"
                : business.trust?.adminApproved
                  ? "Admin approved"
                  : "Live"}
            </Badge>
            {business.trust?.phoneVerified || business.trust?.addressVerified ? (
              <Badge tone="success">Verified</Badge>
            ) : null}
          </div>
          {business.bookingMode === "instant" ? (
            <Badge tone="success">Instant booking</Badge>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end gap-3">
            <LogoMark label={business.logoText} />
            <div className="space-y-1">
              <p className="font-heading text-xl font-semibold text-white">
                {business.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                <span>{categoryName}</span>
                <span className="text-white/40">•</span>
                <span>
                  {cityName}, {business.area}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
            <p className="text-[var(--color-muted)]">Starting price</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatCurrency(startingPrice)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
            <p className="text-[var(--color-muted)]">Next available</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {nextAvailable
                ? `${formatRelativeDay(nextAvailable)} • ${formatTime(nextAvailable)}`
                : "No slots right now"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-secondary)]">
          <div className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--color-accent)]" />
            {cityName}, {business.area}
          </div>
          <div className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--color-accent)]" />
            {business.responseWindow}
          </div>
          <div className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--color-accent)]" />
            {bookingModeLabel(business.bookingMode)}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/business/${business.slug}`} className="flex-1">
            <Button fullWidth icon={<ArrowRight className="h-4 w-4" />}>
              View profile
            </Button>
          </Link>
          <a
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button
              variant="secondary"
              fullWidth
              icon={<MessageCircle className="h-4 w-4" />}
            >
              WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
