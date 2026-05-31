"use client";

import { localeOptions } from "@/lib/i18n";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, messages } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[rgba(255,253,248,0.72)] p-1 shadow-[0_10px_24px_rgba(72,49,31,0.07)] backdrop-blur-xl",
        className,
      )}
      aria-label={messages.languageSwitcherLabel}
      role="group"
    >
      {localeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          aria-label={option.nativeLabel}
          title={option.nativeLabel}
          className={cn(
            "flex min-h-10 items-center rounded-full px-3 text-xs font-semibold tracking-[0.08em] transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-premium)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(22,116,102,0.2)]",
            locale === option.value
              ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_8px_18px_rgba(22,116,102,0.18)]"
              : "text-[var(--color-secondary)] hover:bg-[rgba(22,116,102,0.07)] hover:text-[var(--color-accent)]",
          )}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
