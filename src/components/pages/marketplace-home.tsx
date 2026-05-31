"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
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
import { Button, buttonStyles } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getBusinessCountLabel,
  getCategoryTranslation,
  getCityTranslation,
} from "@/lib/i18n";
import { categories, cities } from "@/lib/taxonomy";
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
      <section className="premium-ring relative overflow-hidden rounded-xl border border-[rgba(54,43,35,0.08)] bg-[var(--color-surface)]">
        <Image
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80"
          alt={messages.home.heroTitle}
          fill
          preload
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,250,243,0.96)_0%,rgba(255,250,243,0.86)_48%,rgba(255,250,243,0.36)_100%)]" />
        <div className="accent-ribbon float-soft right-8 top-10 hidden h-28 w-12 rotate-12 rounded-full md:block" />
        <div className="accent-ribbon float-soft bottom-24 right-24 hidden h-20 w-32 -rotate-6 rounded-[2rem] md:block" />
        <div className="relative flex min-h-[min(760px,calc(100dvh-7rem))] flex-col justify-end gap-8 px-5 py-8 md:px-10 md:py-12">
          <div className="max-w-3xl space-y-7">
            <div className="motion-fade-up">
              <Badge tone="accent">{messages.home.heroBadge}</Badge>
            </div>
            <div className="space-y-5">
              <h1 className="motion-fade-up motion-delay-1 font-heading text-4xl font-semibold leading-tight text-[var(--color-foreground)] sm:text-5xl md:text-6xl">
                {messages.home.heroTitle}
              </h1>
              <p className="motion-fade-up motion-delay-2 max-w-2xl text-base leading-8 text-[var(--color-secondary)] md:text-lg">
                {messages.home.heroDescription}
              </p>
            </div>
            <div className="motion-fade-up motion-delay-3 flex flex-wrap gap-3">
              <Link href="/explore" className={buttonStyles({ size: "lg" })}>
                <ArrowIcon className="h-4 w-4" />
                {messages.home.bookNow}
              </Link>
              <Link
                href="/register?role=shop"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                {messages.home.addBusiness}
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
            <div className="motion-fade-up motion-delay-4 flex flex-wrap gap-2 text-sm text-[var(--color-secondary)]">
              {[
                { label: messages.home.quickBooking, value: "< 60 sec" },
                { label: messages.home.trustedBusinesses, value: `${liveBusinesses.length}` },
                { label: messages.home.categoriesFocus, value: `${localizedCategories.length}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(54,43,35,0.08)] bg-[rgba(255,253,248,0.72)] px-3 py-2 shadow-[0_10px_24px_rgba(72,49,31,0.07)] backdrop-blur-md"
                >
                  <span className="font-semibold text-[var(--color-accent)]">{item.value}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <form
            className="panel shine-card motion-fade-up motion-delay-4 relative w-full p-4 backdrop-blur-md md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearchSubmit();
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  {messages.home.searchTitle}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {messages.home.searchHint}
                </p>
              </div>
              <Badge tone="success">{messages.home.quickBooking}</Badge>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
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
                type="submit"
                size="lg"
                icon={<ArrowIcon className="h-4 w-4" />}
                className="lg:min-w-48"
              >
                {messages.home.searchNow}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.home.categoriesEyebrow}
          title={messages.home.categoriesTitle}
          description={messages.home.categoriesDescription}
        />
        <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {localizedCategories.map((category, index) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className={cn(
                "panel shine-card interactive-card group p-5 hover:border-[var(--color-border-strong)]",
                index === 0 && "sm:col-span-2 xl:col-span-2",
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(22,116,102,0.12)] bg-[rgba(22,116,102,0.08)] text-[var(--color-accent)]">
                <CategoryIcon name={category.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-semibold text-[var(--color-foreground)]">
                {category.shortLabel}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                {category.description}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]">
                {messages.home.exploreCategory}
                <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
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
            <Link
              href="/explore"
              className={buttonStyles({ variant: "secondary" })}
            >
              {messages.home.featuredAction}
            </Link>
          }
        />
        <div className="stagger-children grid gap-5 xl:grid-cols-3">
          {featuredBusinesses.slice(0, 3).map((business, index) => {
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
                eagerImage={index === 0}
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
          <div className="stagger-children grid gap-4 md:grid-cols-2">
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
                <div key={group.title} className="panel shine-card interactive-card p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[rgba(22,116,102,0.12)] bg-[rgba(22,116,102,0.08)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-heading text-2xl font-semibold text-[var(--color-foreground)]">
                    {group.title}
                  </h3>
                  <div className="mt-5 space-y-3">
                    {group.steps.map((step) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-lg bg-[rgba(22,116,102,0.04)] p-3"
                      >
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
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
        <div className="panel grid-sheen interactive-card space-y-5 p-5">
          <Badge tone="success">{messages.home.pwaBadge}</Badge>
          <h3 className="font-heading text-3xl font-semibold text-[var(--color-foreground)]">
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
                  className="rounded-lg bg-[rgba(22,116,102,0.04)] p-4 text-sm text-[var(--color-secondary)]"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    {item.text}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/register?role=shop"
            className={buttonStyles({ fullWidth: true, variant: "secondary" })}
          >
            {messages.home.becomePartner}
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.home.citiesEyebrow}
          title={messages.home.citiesTitle}
          description={messages.home.citiesDescription}
        />
        <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {localizedCities.map((city) => {
            const cityBusinesses = liveBusinesses.filter((business) => business.cityId === city.id);

            return (
              <Link
                key={city.id}
                href={`/city/${city.slug}`}
                className={cn(
                  "panel shine-card group p-5 hover:border-[var(--color-border-strong)]",
                  "interactive-card",
                  cityBusinesses.length === 0 && "opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-[var(--color-foreground)]">
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

      <section className="grid-sheen panel scroll-reveal grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative">
          <Badge tone="accent">{messages.home.joinBadge}</Badge>
          <h2 className="mt-5 font-heading text-3xl font-semibold text-[var(--color-foreground)] md:text-4xl">
            {messages.home.joinTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            {messages.home.joinDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register?role=shop" className={buttonStyles()}>
              <ArrowIcon className="h-4 w-4" />
              {messages.home.addBusiness}
            </Link>
            <Link
              href="/login?role=shop&next=/dashboard"
              className={buttonStyles({ variant: "secondary" })}
            >
              {messages.home.viewDashboard}
            </Link>
          </div>
        </div>
        <div className="relative space-y-4 rounded-lg bg-[rgba(22,116,102,0.04)] p-5">
          <h3 className="font-heading text-2xl font-semibold text-[var(--color-foreground)]">
            {messages.home.faqTitle}
          </h3>
          {messages.home.faqItems.map((item) => (
            <div key={item.q} className="rounded-lg bg-[rgba(255,253,248,0.72)] p-4 shadow-[0_10px_24px_rgba(72,49,31,0.06)]">
              <p className="font-medium text-[var(--color-foreground)]">{item.q}</p>
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
