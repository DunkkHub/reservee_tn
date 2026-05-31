"use client";

import { addDays, formatISO } from "date-fns";
import { useState } from "react";
import { Building2, CheckCircle2, MapPinned, ShieldCheck, Sparkles, Star } from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { businessStatusLabel, businessStatusTone, getGalleryItems } from "@/lib/platform-rules";
import { getCategoryTranslation, getCityTranslation } from "@/lib/i18n";
import { categories, cities } from "@/lib/taxonomy";
import type { BusinessStatus } from "@/lib/types";
import { formatDateTime, formatMonthYear } from "@/lib/utils";

const filters: Array<BusinessStatus | "all"> = [
  "all",
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "featured",
  "suspended",
  "archived",
];

export function AdminPage() {
  const { auditLog, bookings, businesses, moderateBusiness } = usePlatform();
  const { locale, messages } = useLocale();
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [notes, setNotes] = useState<Record<string, { internalNote: string; businessMessage: string; days: string; rank: string }>>({});

  const pendingBusinesses = businesses.filter((business) =>
    ["draft", "pending_review", "changes_requested"].includes(business.status),
  );
  const liveBusinesses = businesses.filter((business) =>
    ["approved", "featured"].includes(business.status),
  );
  const todaysBookings = bookings.filter(
    (booking) => new Date(booking.startAt).toDateString() === new Date().toDateString(),
  );
  const filteredBusinesses = businesses.filter((business) => {
    if (statusFilter !== "all" && business.status !== statusFilter) return false;
    if (cityFilter !== "all" && business.cityId !== cityFilter) return false;
    if (categoryFilter !== "all" && business.categoryId !== categoryFilter) return false;
    return true;
  });
  const localizedCategories = categories.map((category) => ({
    ...category,
    ...getCategoryTranslation(category.slug, locale),
  }));
  const localizedCities = cities.map((city) => ({
    ...city,
    ...(getCityTranslation(city.slug, locale) ?? { name: city.name }),
  }));
  const statusCopy = (status: BusinessStatus) =>
    messages.admin.statuses[status] ?? businessStatusLabel(status);

  function getNote(id: string) {
    return notes[id] ?? { internalNote: "", businessMessage: "", days: "14", rank: "1" };
  }

  function updateNote(
    id: string,
    updates: Partial<{ internalNote: string; businessMessage: string; days: string; rank: string }>,
  ) {
    setNotes((current) => ({ ...current, [id]: { ...getNote(id), ...updates } }));
  }

  function applyStatus(id: string, status: BusinessStatus) {
    const note = getNote(id);
    moderateBusiness(id, {
      status,
      internalNote: note.internalNote,
      businessMessage: note.businessMessage,
      featuredUntil: status === "featured" ? formatISO(addDays(new Date(), Number(note.days || "14"))) : null,
      featuredRank: status === "featured" ? Number(note.rank || "1") : null,
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={messages.admin.eyebrow}
        title={messages.admin.title}
        description={messages.admin.description}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{messages.admin.pendingReview}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{pendingBusinesses.length}</p>
        </div>
        <div className="panel p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{messages.admin.liveBusinesses}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{liveBusinesses.length}</p>
        </div>
        <div className="panel p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{messages.admin.bookingsToday}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{todaysBookings.length}</p>
        </div>
        <div className="panel p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
            <MapPinned className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{messages.admin.citiesCovered}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{new Set(liveBusinesses.map((item) => item.cityId)).size}</p>
        </div>
      </div>

      <section className="panel p-5">
        <div className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.2fr]">
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.admin.status}</span>
            <select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BusinessStatus | "all")}>
              {filters.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? messages.admin.allStatuses : statusCopy(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.admin.city}</span>
            <select className="input-field" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
              <option value="all">{messages.admin.allCities}</option>
              {localizedCities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">{messages.admin.category}</span>
            <select className="input-field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{messages.admin.allCategories}</option>
              {localizedCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
            {messages.admin.featuredHint}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {filteredBusinesses.length > 0 ? (
            filteredBusinesses.map((business) => {
              const category = localizedCategories.find((item) => item.id === business.categoryId);
              const city = localizedCities.find((item) => item.id === business.cityId);
              const note = getNote(business.id);
              const latestModeration = business.moderationHistory[0];

              return (
                <div key={business.id} className="panel p-5">
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading text-2xl font-semibold text-white">{business.name}</h2>
                          <Badge tone={businessStatusTone(business.status)}>{statusCopy(business.status)}</Badge>
                          <Badge tone="default">{business.profileCompletion}% {messages.admin.complete}</Badge>
                        </div>
                        <p className="text-sm text-[var(--color-secondary)]">
                          {category?.name} / {city?.name} / {business.area}
                        </p>
                        <p className="max-w-3xl text-sm leading-7 text-[var(--color-secondary)]">{business.description}</p>
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <p className="text-[var(--color-secondary)]">{messages.admin.gallery}</p>
                          <p className="mt-2 text-white">{getGalleryItems(business.media).length} {messages.admin.images}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <p className="text-[var(--color-secondary)]">{messages.admin.joined}</p>
                          <p className="mt-2 text-white">{formatMonthYear(business.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="text-[var(--color-secondary)]">{messages.admin.internalNote}</span>
                        <textarea
                          className="input-field min-h-24 rounded-3xl py-3"
                          value={note.internalNote}
                          onChange={(event) => updateNote(business.id, { internalNote: event.target.value })}
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-[var(--color-secondary)]">{messages.admin.businessMessage}</span>
                        <textarea
                          className="input-field min-h-24 rounded-3xl py-3"
                          value={note.businessMessage}
                          onChange={(event) => updateNote(business.id, { businessMessage: event.target.value })}
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_140px]">
                      <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                        {messages.admin.featuredRule}
                      </div>
                      <label className="space-y-2 text-sm">
                        <span className="text-[var(--color-secondary)]">{messages.admin.featuredDays}</span>
                        <input className="input-field" value={note.days} onChange={(event) => updateNote(business.id, { days: event.target.value })} />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-[var(--color-secondary)]">{messages.admin.priorityRank}</span>
                        <input className="input-field" value={note.rank} onChange={(event) => updateNote(business.id, { rank: event.target.value })} />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => applyStatus(business.id, "approved")}>{messages.admin.approve}</Button>
                      <Button variant="secondary" onClick={() => applyStatus(business.id, "changes_requested")}>{messages.admin.requestChanges}</Button>
                      <Button variant="secondary" onClick={() => applyStatus(business.id, "featured")}>{messages.admin.feature}</Button>
                      <Button variant="ghost" onClick={() => applyStatus(business.id, "suspended")}>{messages.admin.suspend}</Button>
                      <Button variant="ghost" onClick={() => applyStatus(business.id, "archived")}>{messages.admin.archive}</Button>
                    </div>

                    {latestModeration ? (
                      <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]">
                        <p className="font-medium text-white">{messages.admin.latestModeration}</p>
                        <p className="mt-2">{latestModeration.internalNote}</p>
                        <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(latestModeration.changedAt)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={Building2}
              title={messages.admin.emptyTitle}
              description={messages.admin.emptyDescription}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{messages.admin.categoryMix}</h2>
            <div className="mt-4 space-y-3">
              {localizedCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">{category.name}</span>
                  <Badge tone="accent">{liveBusinesses.filter((item) => item.categoryId === category.id).length}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="font-heading text-2xl font-semibold text-white">{messages.admin.cityMix}</h2>
            <div className="mt-4 space-y-3">
              {localizedCities.map((city) => (
                <div key={city.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-secondary)]">{city.name}</span>
                  <Badge tone="default">{liveBusinesses.filter((item) => item.cityId === city.id).length}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
              <h2 className="font-heading text-2xl font-semibold text-white">{messages.admin.auditTrail}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {auditLog.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm">
                  <p className="text-white">{entry.summary}</p>
                  <p className="mt-2 text-[var(--color-muted)]">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5 text-sm text-[var(--color-secondary)]">
            <div className="flex items-start gap-3">
              <Star className="mt-1 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              {messages.admin.reviewHint}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
