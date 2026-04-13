"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Clock3, Search, SlidersHorizontal } from "lucide-react";

import { usePlatform } from "@/components/providers/platform-provider";
import { BusinessCard } from "@/components/pages/business-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { findNextAvailableSlot, generateAvailableSlots } from "@/lib/availability";
import { isBusinessFeatured } from "@/lib/platform-rules";
import { categories, cities } from "@/lib/seed-data";
import type { Audience, Business } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type SortOption = "recommended" | "available_today" | "lowest_price" | "newest" | "featured";

interface ExploreBrowserProps {
  title: string;
  description: string;
  presetCategorySlug?: string;
  presetCitySlug?: string;
}

function getStartingPrice(business: Business) {
  return Math.min(...business.services.filter((service) => service.active).map((service) => service.price));
}

function getCategorySlug(business: Business) {
  return categories.find((category) => category.id === business.categoryId)?.slug ?? "";
}

function getCitySlug(business: Business) {
  return cities.find((city) => city.id === business.cityId)?.slug ?? "";
}

function isBusinessOpenNow(business: Business) {
  const now = new Date();
  const currentHours = business.hours.find((hour) => hour.dayOfWeek === now.getDay());

  if (!currentHours || currentHours.isClosed) {
    return false;
  }

  const [openHours, openMinutes] = currentHours.openTime.split(":").map(Number);
  const [closeHours, closeMinutes] = currentHours.closeTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openAt = openHours * 60 + openMinutes;
  const closeAt = closeHours * 60 + closeMinutes;

  if (currentMinutes < openAt || currentMinutes > closeAt) {
    return false;
  }

  return !(currentHours.breaks ?? []).some((breakWindow) => {
    const [breakStartHours, breakStartMinutes] = breakWindow.start.split(":").map(Number);
    const [breakEndHours, breakEndMinutes] = breakWindow.end.split(":").map(Number);
    const breakStart = breakStartHours * 60 + breakStartMinutes;
    const breakEnd = breakEndHours * 60 + breakEndMinutes;
    return currentMinutes >= breakStart && currentMinutes <= breakEnd;
  });
}

function matchesAudience(businessAudience: Audience, selected: string) {
  if (!selected) {
    return true;
  }

  if (selected === "men") {
    return businessAudience === "men" || businessAudience === "unisex";
  }

  if (selected === "women") {
    return businessAudience === "women" || businessAudience === "unisex";
  }

  return businessAudience === selected;
}

export function ExploreBrowser({
  title,
  description,
  presetCategorySlug,
  presetCitySlug,
}: ExploreBrowserProps) {
  const searchParams = useSearchParams();
  const { liveBusinesses, bookings } = usePlatform();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(
    presetCategorySlug ?? searchParams.get("category") ?? "",
  );
  const [cityFilter, setCityFilter] = useState(
    presetCitySlug ?? searchParams.get("city") ?? "",
  );
  const [areaFilter, setAreaFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(
    searchParams.get("today") === "1",
  );

  const deferredQuery = useDeferredValue(query);
  const filteredBusinesses = liveBusinesses
    .filter((business) => {
      const categorySlug = getCategorySlug(business);
      const citySlug = getCitySlug(business);
      const search = deferredQuery.toLowerCase().trim();

      if (categoryFilter && categorySlug !== categoryFilter) {
        return false;
      }

      if (cityFilter && citySlug !== cityFilter) {
        return false;
      }

      if (areaFilter && business.area !== areaFilter) {
        return false;
      }

      if (!matchesAudience(business.audience, audienceFilter)) {
        return false;
      }

      if (priceFilter === "budget" && getStartingPrice(business) > 50) {
        return false;
      }

      if (priceFilter === "mid" && (getStartingPrice(business) < 50 || getStartingPrice(business) > 90)) {
        return false;
      }

      if (priceFilter === "premium" && getStartingPrice(business) < 90) {
        return false;
      }

      if (openNowOnly && !isBusinessOpenNow(business)) {
        return false;
      }

      if (availableTodayOnly) {
        const service = business.services.find((item) => item.active);
        if (!service || generateAvailableSlots(business, service, bookings, new Date()).length === 0) {
          return false;
        }
      }

      if (sortBy === "featured" && !isBusinessFeatured(business)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        business.name,
        business.area,
        business.description,
        business.tagline,
        ...business.services.map((service) => service.title),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((left, right) => {
      if (sortBy === "featured") {
        return Number(isBusinessFeatured(right)) - Number(isBusinessFeatured(left));
      }

      if (sortBy === "available_today") {
        const leftNext = findNextAvailableSlot(left, left.services[0], bookings, 1);
        const rightNext = findNextAvailableSlot(right, right.services[0], bookings, 1);

        if (!leftNext && !rightNext) return 0;
        if (!leftNext) return 1;
        if (!rightNext) return -1;

        return leftNext.getTime() - rightNext.getTime();
      }

      if (sortBy === "lowest_price") {
        return getStartingPrice(left) - getStartingPrice(right);
      }

      if (sortBy === "newest") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      return (
        Number(isBusinessFeatured(right)) - Number(isBusinessFeatured(left)) ||
        right.profileCompletion - left.profileCompletion
      );
    });

  const areas = Array.from(
    new Set(
      liveBusinesses
        .filter((business) => !cityFilter || getCitySlug(business) === cityFilter)
        .map((business) => business.area),
    ),
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Marketplace"
        title={title}
        description={description}
        action={
          <Link href="/register?role=shop">
            <Button variant="secondary">Ajouter mon business</Button>
          </Link>
        }
      />

      <section className="panel p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <label className="space-y-2 text-sm">
            <span className="inline-flex items-center gap-2 text-[var(--color-secondary)]">
              <Search className="h-4 w-4" />
              Recherche
            </span>
            <input
              className="input-field"
              placeholder="Nom, service ou quartier"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Categorie</span>
            <select
              className="input-field"
              value={categoryFilter}
              disabled={Boolean(presetCategorySlug)}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Ville</span>
            <select
              className="input-field"
              value={cityFilter}
              disabled={Boolean(presetCitySlug)}
              onChange={(event) => setCityFilter(event.target.value)}
            >
              <option value="">Toutes</option>
              {cities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Quartier</span>
            <select
              className="input-field"
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
            >
              <option value="">Tous</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.1fr]">
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Audience</span>
            <select
              className="input-field"
              value={audienceFilter}
              onChange={(event) => setAudienceFilter(event.target.value)}
            >
              <option value="">Men / Women / Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Prix</span>
            <select
              className="input-field"
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
            >
              <option value="">Tous les prix</option>
              <option value="budget">Jusqu&apos;a {formatCurrency(50)}</option>
              <option value="mid">{formatCurrency(50)} a {formatCurrency(90)}</option>
              <option value="premium">Premium +90 DT</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Trier par</span>
            <select
              className="input-field"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <option value="recommended">Recommended</option>
              <option value="available_today">Available today</option>
              <option value="lowest_price">Lowest starting price</option>
              <option value="newest">Newest</option>
              <option value="featured">Featured only</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => setOpenNowOnly((current) => !current)}
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                openNowOnly
                  ? "border-[rgba(200,169,107,0.3)] bg-[rgba(200,169,107,0.12)] text-[var(--color-accent)]"
                  : "border-white/8 bg-white/4 text-[var(--color-secondary)]",
              )}
            >
              <Clock3 className="h-4 w-4" />
              Open now
            </button>
            <button
              type="button"
              onClick={() => setAvailableTodayOnly((current) => !current)}
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                availableTodayOnly
                  ? "border-[rgba(59,178,115,0.3)] bg-[rgba(59,178,115,0.12)] text-[var(--color-success)]"
                  : "border-white/8 bg-white/4 text-[var(--color-secondary)]",
              )}
            >
              <CalendarClock className="h-4 w-4" />
              Available today
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge tone="default">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            {filteredBusinesses.length} resultats
          </Badge>
          {availableTodayOnly ? <Badge tone="success">Today only</Badge> : null}
          {openNowOnly ? <Badge tone="accent">Open now</Badge> : null}
        </div>
      </section>

      {filteredBusinesses.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredBusinesses.map((business) => {
            const category = categories.find((item) => item.id === business.categoryId);
            const city = cities.find((item) => item.id === business.cityId);

            return (
              <BusinessCard
                key={business.id}
                business={business}
                categoryName={category?.name ?? ""}
                cityName={city?.name ?? ""}
                bookings={bookings}
                compact
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No matches yet"
          description="Try widening the city, price or audience filters. Version 1 stays focused on beauty businesses only, so discovery stays clean and dependable."
          ctaLabel="Become a partner"
          ctaHref="/register?role=shop"
        />
      )}
    </div>
  );
}
