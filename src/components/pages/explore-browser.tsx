"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Clock3, Search, SlidersHorizontal } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { BusinessCard } from "@/components/pages/business-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getAudienceLabel,
  getCategoryTranslation,
  getCityTranslation,
  getResultsLabel,
} from "@/lib/i18n";
import { isBusinessFeatured } from "@/lib/platform-rules";
import { categories, cities } from "@/lib/taxonomy";
import type { Audience, Business } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type SortOption = "recommended" | "available_today" | "lowest_price" | "newest" | "featured";

interface ExploreBrowserProps {
  title?: string;
  description?: string;
  presetCategorySlug?: string;
  presetCitySlug?: string;
}

function getStartingPrice(business: Business) {
  const prices = business.services
    .filter((service) => service.active)
    .map((service) => service.price);
  return prices.length > 0 ? Math.min(...prices) : 0;
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
  const { locale, messages } = useLocale();
  const { liveBusinesses } = usePlatform();
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
  const normalizedQuery = deferredQuery.toLowerCase().trim();
  const localizedCategories = categories.map((category) => ({
    ...category,
    ...getCategoryTranslation(category.slug, locale),
  }));
  const localizedCities = cities.map((city) => ({
    ...city,
    ...(getCityTranslation(city.slug, locale) ?? { name: city.name, heroCopy: city.heroCopy }),
  }));
  const selectedCategoryMeta = presetCategorySlug
    ? localizedCategories.find((category) => category.slug === presetCategorySlug)
    : null;
  const selectedCityMeta = presetCitySlug
    ? localizedCities.find((city) => city.slug === presetCitySlug)
    : null;
  const resolvedTitle =
    title ??
    (selectedCategoryMeta
      ? selectedCategoryMeta.name
      : selectedCityMeta
        ? `${messages.explore.cityPrefix} ${selectedCityMeta.name}`
        : messages.explore.title);
  const resolvedDescription =
    description ??
    selectedCategoryMeta?.description ??
    selectedCityMeta?.heroCopy ??
    messages.explore.description;

  const filteredBusinesses = useMemo(() => {
    return liveBusinesses
      .filter((business) => {
        const categorySlug = getCategorySlug(business);
        const citySlug = getCitySlug(business);

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

        if (
          priceFilter === "mid" &&
          (getStartingPrice(business) < 50 || getStartingPrice(business) > 90)
        ) {
          return false;
        }

        if (priceFilter === "premium" && getStartingPrice(business) < 90) {
          return false;
        }

        if (openNowOnly && !isBusinessOpenNow(business)) {
          return false;
        }

        if (availableTodayOnly && !business.hasAvailabilityToday) {
          return false;
        }

        if (sortBy === "featured" && !isBusinessFeatured(business)) {
          return false;
        }

        if (!normalizedQuery) {
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

        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sortBy === "featured") {
          return Number(isBusinessFeatured(right)) - Number(isBusinessFeatured(left));
        }

        if (sortBy === "available_today") {
          const leftNext = left.nextAvailableAt ? new Date(left.nextAvailableAt) : null;
          const rightNext = right.nextAvailableAt ? new Date(right.nextAvailableAt) : null;

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
  }, [
    audienceFilter,
    availableTodayOnly,
    areaFilter,
    categoryFilter,
    cityFilter,
    liveBusinesses,
    normalizedQuery,
    openNowOnly,
    priceFilter,
    sortBy,
  ]);

  const areas = useMemo(() => {
    return Array.from(
      new Set(
        liveBusinesses
          .filter((business) => !cityFilter || getCitySlug(business) === cityFilter)
          .map((business) => business.area),
      ),
    );
  }, [cityFilter, liveBusinesses]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={messages.explore.eyebrow}
        title={resolvedTitle}
        description={resolvedDescription}
        action={
          <Link href="/register?role=shop">
            <Button variant="secondary">{messages.explore.addBusiness}</Button>
          </Link>
        }
      />

      <section className="panel p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <label className="space-y-2 text-sm">
            <span className="inline-flex items-center gap-2 text-[var(--color-secondary)]">
              <Search className="h-4 w-4" />
              {messages.explore.search}
            </span>
            <input
              className="input-field"
              placeholder={messages.explore.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.explore.category}</span>
            <select
              className="input-field"
              value={categoryFilter}
              disabled={Boolean(presetCategorySlug)}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">{messages.explore.allOptions}</option>
              {localizedCategories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.explore.city}</span>
            <select
              className="input-field"
              value={cityFilter}
              disabled={Boolean(presetCitySlug)}
              onChange={(event) => setCityFilter(event.target.value)}
            >
              <option value="">{messages.explore.allOptions}</option>
              {localizedCities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.explore.area}</span>
            <select
              className="input-field"
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
            >
              <option value="">{messages.explore.allAreas}</option>
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
            <span className="text-[var(--color-secondary)]">{messages.explore.audience}</span>
            <select
              className="input-field"
              value={audienceFilter}
              onChange={(event) => setAudienceFilter(event.target.value)}
            >
              <option value="">{messages.explore.audienceAll}</option>
              <option value="men">{getAudienceLabel("men", locale)}</option>
              <option value="women">{getAudienceLabel("women", locale)}</option>
              <option value="unisex">{getAudienceLabel("unisex", locale)}</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.explore.price}</span>
            <select
              className="input-field"
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
            >
              <option value="">{messages.explore.allPrices}</option>
              <option value="budget">
                {messages.explore.budgetUpTo} {formatCurrency(50, locale)}
              </option>
              <option value="mid">
                {formatCurrency(50, locale)} {messages.explore.between}{" "}
                {formatCurrency(90, locale)}
              </option>
              <option value="premium">{messages.explore.premium}</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.explore.sortBy}</span>
            <select
              className="input-field"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <option value="recommended">{messages.explore.recommended}</option>
              <option value="available_today">{messages.explore.availableToday}</option>
              <option value="lowest_price">{messages.explore.lowestPrice}</option>
              <option value="newest">{messages.explore.newest}</option>
              <option value="featured">{messages.explore.featuredOnly}</option>
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
              {messages.explore.openNow}
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
              {messages.explore.availableToday}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge tone="default">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            {getResultsLabel(filteredBusinesses.length, locale)}
          </Badge>
          {availableTodayOnly ? <Badge tone="success">{messages.explore.todayOnly}</Badge> : null}
          {openNowOnly ? <Badge tone="accent">{messages.explore.openNow}</Badge> : null}
        </div>
      </section>

      {filteredBusinesses.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredBusinesses.map((business) => {
            const category = categories.find((item) => item.id === business.categoryId);
            const city = cities.find((item) => item.id === business.cityId);
            const localizedCategory = category
              ? getCategoryTranslation(category.slug, locale)
              : null;
            const localizedCity = city ? getCityTranslation(city.slug, locale) : null;

            return (
              <BusinessCard
                key={business.id}
                business={business}
                categoryName={localizedCategory?.name ?? ""}
                cityName={localizedCity?.name ?? city?.name ?? ""}
                compact
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title={messages.explore.noMatchesTitle}
          description={messages.explore.noMatchesDescription}
          ctaLabel={messages.explore.noMatchesCta}
          ctaHref="/register?role=shop"
        />
      )}
    </div>
  );
}
