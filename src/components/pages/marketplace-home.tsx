"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  Download,
  MapPinned,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";

import { usePlatform } from "@/components/providers/platform-provider";
import { usePwa } from "@/components/providers/pwa-provider";
import { BusinessCard } from "@/components/pages/business-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { categories, cities } from "@/lib/seed-data";
import { cn } from "@/lib/utils";

export function MarketplaceHomePage() {
  const router = useRouter();
  const { liveBusinesses } = usePlatform();
  const { canInstall, installPwa } = usePwa();
  const [search, setSearch] = useState({
    city: "",
    category: "",
    query: "",
  });

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
          alt="Luxury beauty booking"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,17,21,0.92),rgba(15,17,21,0.72),rgba(15,17,21,0.48))]" />
        <div className="relative grid gap-10 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl space-y-6">
            <Badge tone="accent">La plateforme booking moderne pour la beaute en Tunisie</Badge>
            <div className="space-y-5">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                Book your next beauty appointment in minutes
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--color-secondary)] md:text-lg">
                Discover trusted salons, barbers, spas, and beauty centers across Tunisia.
                Built mobile-first, installable like an app, and sharp enough to feel premium
                from the first tap.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/explore">
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Book now
                </Button>
              </Link>
              <Link href="/register?role=shop">
                <Button variant="secondary" size="lg">
                  Add your business
                </Button>
              </Link>
              {canInstall ? (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => void installPwa()}
                >
                  Installer la PWA
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Reservation rapide", value: "< 60 sec" },
                { label: "Trusted businesses", value: `${liveBusinesses.length}` },
                { label: "Categories focus", value: "5 niches" },
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
              Search fast
            </p>
            <div className="mt-5 space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Ville</span>
                <select
                  value={search.city}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, city: event.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Categorie</span>
                <select
                  value={search.category}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, category: event.target.value }))
                  }
                  className="input-field"
                >
                  <option value="">Toutes les categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Service ou business</span>
                <input
                  value={search.query}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, query: event.target.value }))
                  }
                  className="input-field"
                  placeholder="Ex: fade, brushing, hammam"
                />
              </label>
              <Button
                fullWidth
                size="lg"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={handleSearchSubmit}
              >
                Chercher maintenant
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Categories"
          title="Une niche claire, pas un catalogue brouillon"
          description="Le produit reste volontairement concentre sur cinq categories ou la logique de reservation reste simple, premium et dependable."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => (
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
                Explorer <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Featured"
          title="Business pages that actually feel premium"
          description="The first impression matters. Big imagery, clear services, trust signals, next available slots, and a fast WhatsApp fallback when needed."
          action={
            <Link href="/explore">
              <Button variant="secondary">Voir toutes les adresses</Button>
            </Link>
          }
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {featuredBusinesses.slice(0, 3).map((business) => {
            const category = categories.find((item) => item.id === business.categoryId);
            const city = cities.find((item) => item.id === business.cityId);

            return (
              <BusinessCard
                key={business.id}
                business={business}
                categoryName={category?.name ?? ""}
                cityName={city?.name ?? ""}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="How it works"
            title="Simple for clients, cleaner for business owners"
            description="The platform solves discovery and operations at the same time, which is why the experience has to stay friction-light on both sides."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "For customers",
                steps: [
                  "Choose a business near you",
                  "Select a service and free slot",
                  "Confirm with name and phone",
                  "Use WhatsApp only when you want to",
                ],
                icon: CalendarCheck2,
              },
              {
                title: "For businesses",
                steps: [
                  "Create a polished profile",
                  "Add services, prices and durations",
                  "Set hours and block dates",
                  "Confirm or manage bookings in one place",
                ],
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
          <Badge tone="success">Pourquoi la PWA marche ici</Badge>
          <h3 className="font-heading text-3xl font-semibold text-white">
            Installable, shareable, app-like
          </h3>
          <p className="text-sm leading-7 text-[var(--color-secondary)]">
            Tunisia is already mobile-heavy and beauty discovery often starts on Instagram,
            WhatsApp, or Google. A PWA keeps the product linkable and searchable while still
            feeling close to a native app.
          </p>
          <div className="space-y-3">
            {[
              { icon: MapPinned, text: "Search from city, category, service or business name" },
              { icon: ShieldCheck, text: "Trusted profiles with verification and policy signals" },
              { icon: Download, text: "Home Screen install path for app-like return visits" },
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
              Become a partner
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Popular Cities"
          title="Start city-first, then scale with proof"
          description="The launch strategy stays realistic: go deep in the first cities, manually onboard the strongest shops, and keep the homepage visually sharp from day one."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cities.map((city) => {
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
                    {cityBusinesses.length} business
                  </Badge>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]">
                  Voir les adresses
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="panel p-6 md:p-8">
          <Badge tone="accent">Own a salon or barber shop? Join the platform.</Badge>
          <h2 className="mt-5 font-heading text-3xl font-semibold text-white md:text-4xl">
            Get booked, stay organized, and look premium online.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            Replace WhatsApp chaos with a clean booking flow, visible availability, premium
            photos, and one dashboard for bookings, services, schedules and client follow-up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register?role=shop">
              <Button icon={<ArrowRight className="h-4 w-4" />}>Add your business</Button>
            </Link>
            <Link href="/login?role=shop&next=/dashboard">
              <Button variant="secondary">View the dashboard</Button>
            </Link>
          </div>
        </div>
        <div className="panel space-y-4 p-6">
          <h3 className="font-heading text-2xl font-semibold text-white">FAQ</h3>
          {[
            {
              q: "Is it free for clients?",
              a: "Yes. Clients browse, compare and book without creating an account in version 1.",
            },
            {
              q: "How do bookings work?",
              a: "The platform shows only valid free slots based on service duration, business hours and blocked times.",
            },
            {
              q: "Can businesses approve appointments?",
              a: "Yes. Owners can confirm, reject, complete, cancel or mark no-show from the dashboard.",
            },
            {
              q: "Can I still contact the business by WhatsApp?",
              a: "Yes. Every listing includes a direct WhatsApp fallback for reassurance and last-mile communication.",
            },
          ].map((item) => (
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
