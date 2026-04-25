"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  Download,
  MapPinned,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { usePwa } from "@/components/providers/pwa-provider";
import { BusinessCard } from "@/components/pages/business-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getBusinessCountLabel,
  getCategoryTranslation,
  getCityTranslation,
} from "@/lib/i18n";
import { categories, cities } from "@/lib/seed-data";
import { cn } from "@/lib/utils";

export function MarketplaceHomePage() {
  const router = useRouter();
  const { locale, direction, messages } = useLocale();
  const { liveBusinesses } = usePlatform();
  const { canInstall, installPwa } = usePwa();
  const [search, setSearch] = useState({
    city: "",
    category: "",
    query: "",
  });

  const ArrowIcon = direction === "rtl" ? ArrowLeft : ArrowRight;
  const localizedCategories = categories.map((category) => ({
    ...category,
    ...getCategoryTranslation(category.slug, locale),
  }));
  const localizedCities = cities.map((city) => ({
    ...city,
    ...(getCityTranslation(city.slug, locale) ?? { name: city.name, heroCopy: city.heroCopy }),
  }));
  const featuredBusinesses = liveBusinesses.filter(
    (business) => business.status === "featured",
  );

  function handleSearchSubmit() {
    const params = new URLSearchParams();
    if (search.city) params.set("city", search.city);
    if (search.category) params.set("category", search.category);
    if (search.query.trim()) params.set("q", search.query.trim());
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <div className="space-y-14 md:space-y-20">
      <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[var(--color-surface)]">
        <Image
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80"
          alt={messages.home.heroTitle}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,17,21,0.92),rgba(15,17,21,0.72),rgba(15,17,21,0.48))]" />
        <div className="relative grid gap-10 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl space-y-6">
            <Badge tone="accent">{messages.home.heroBadge}</Badge>
            <div className="space-y-5">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                {messages.home.heroTitle}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--color-secondary)] md:text-lg">
                {messages.home.heroDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/explore">
                <Button size="lg" icon={<ArrowIcon className="h-4 w-4" />}>
                  {messages.home.bookNow}
                </Button>
              </Link>
              <Link href="/register?role=shop">
                <Button variant="secondary" size="lg">
                  {messages.home.addBusiness}
                </Button>
              </Link>
              {canInstall ? (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => void installPwa()}
                >
                  {messages.home.installPwa}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: messages.home.quickBooking, value: "< 60 sec" },
                { label: messages.home.trustedBusinesses, value: `${liveBusinesses.length}` },
                { label: messages.home.categoriesFocus, value: `${localizedCategories.length}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel relative p-5 backdrop-blur-md">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              {messages.home.searchTitle}
            </p>
            <div className="mt-5 space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">{messages.home.city}</span>
                <select
                  value={search.city}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, city: event.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">{messages.home.allCities}</option>
                  {localizedCities.map((city) => (
                    <option key={city.id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">
                  {messages.home.category}
                </span>
                <select
                  value={search.category}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, category: event.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">{messages.home.allCategories}</option>
                  {localizedCategories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">
                  {messages.home.serviceOrBusiness}
                </span>
                <input
                  value={search.query}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, query: event.target.value }))
                  }
                  className="input-field"
                  placeholder={messages.home.searchPlaceholder}
                />
              </label>
              <Button
                fullWidth
                size="lg"
                icon={<ArrowIcon className="h-4 w-4" />}
                onClick={handleSearchSubmit}
              >
                {messages.home.searchNow}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.home.categoriesEyebrow}
          title={messages.home.categoriesTitle}
          description={messages.home.categoriesDescription}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {localizedCategories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="panel group p-5 transition hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(200,169,107,0.14)] text-[var(--color-accent)]">
                <CategoryIcon name={category.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-semibold text-white">
                {category.shortLabel}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                {category.description}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]">
                {messages.home.exploreCategory}
                <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.home.featuredEyebrow}
          title={messages.home.featuredTitle}
          description={messages.home.featuredDescription}
          action={
            <Link href="/explore">
              <Button variant="secondary">{messages.home.featuredAction}</Button>
            </Link>
          }
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {featuredBusinesses.slice(0, 3).map((business) => {
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
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow={messages.home.howItWorksEyebrow}
            title={messages.home.howItWorksTitle}
            description={messages.home.howItWorksDescription}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: messages.home.forCustomers,
                steps: messages.home.customerSteps,
                icon: CalendarCheck2,
              },
              {
                title: messages.home.forBusinesses,
                steps: messages.home.businessSteps,
                icon: Store,
              },
            ].map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="panel p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-heading text-2xl font-semibold text-white">
                    {group.title}
                  </h3>
                  <div className="mt-5 space-y-3">
                    {group.steps.map((step, index) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/4 p-3"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(200,169,107,0.18)] text-xs font-semibold text-[var(--color-accent)]">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-7 text-[var(--color-secondary)]">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel space-y-5 p-5">
          <Badge tone="success">{messages.home.pwaBadge}</Badge>
          <h3 className="font-heading text-3xl font-semibold text-white">
            {messages.home.pwaTitle}
          </h3>
          <p className="text-sm leading-7 text-[var(--color-secondary)]">
            {messages.home.pwaDescription}
          </p>
          <div className="space-y-3">
            {[
              { icon: MapPinned, text: messages.home.pwaPoints[0] },
              { icon: ShieldCheck, text: messages.home.pwaPoints[1] },
              { icon: Download, text: messages.home.pwaPoints[2] },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    {item.text}
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/register?role=shop">
            <Button fullWidth variant="secondary">
              {messages.home.becomePartner}
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.home.citiesEyebrow}
          title={messages.home.citiesTitle}
          description={messages.home.citiesDescription}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {localizedCities.map((city) => {
            const cityBusinesses = liveBusinesses.filter((business) => business.cityId === city.id);

            return (
              <Link
                key={city.id}
                href={`/city/${city.slug}`}
                className={cn(
                  "panel group p-5 transition hover:-translate-y-1",
                  cityBusinesses.length === 0 && "opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-white">
                      {city.name}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                      {city.heroCopy}
                    </p>
                  </div>
                  <Badge tone={cityBusinesses.length > 0 ? "accent" : "muted"}>
                    {getBusinessCountLabel(cityBusinesses.length, locale)}
                  </Badge>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]">
                  {messages.home.cityAction}
                  <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="panel p-6 md:p-8">
          <Badge tone="accent">{messages.home.joinBadge}</Badge>
          <h2 className="mt-5 font-heading text-3xl font-semibold text-white md:text-4xl">
            {messages.home.joinTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            {messages.home.joinDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register?role=shop">
              <Button icon={<ArrowIcon className="h-4 w-4" />}>
                {messages.home.addBusiness}
              </Button>
            </Link>
            <Link href="/login?role=shop&next=/dashboard">
              <Button variant="secondary">{messages.home.viewDashboard}</Button>
            </Link>
          </div>
        </div>
        <div className="panel space-y-4 p-6">
          <h3 className="font-heading text-2xl font-semibold text-white">
            {messages.home.faqTitle}
          </h3>
          {messages.home.faqItems.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="font-medium text-white">{item.q}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-secondary)]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
