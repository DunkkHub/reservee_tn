"use client";

import { localeOptions } from "@/lib/i18n";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, messages } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1",
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
            "rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.14em] transition",
            locale === option.value
              ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
              : "text-[var(--color-secondary)] hover:bg-white/8 hover:text-white",
          )}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
