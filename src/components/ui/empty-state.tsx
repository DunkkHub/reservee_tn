import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="panel flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/6">
        <Icon className="h-5 w-5 text-[var(--color-accent)]" />
      </div>
      <div className="space-y-2">
        <h3 className="font-heading text-2xl font-semibold text-white">{title}</h3>
        <p className="max-w-md text-sm leading-7 text-[var(--color-secondary)]">
          {description}
        </p>
      </div>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref}>
          <Button>{ctaLabel}</Button>
        </Link>
      ) : null}
    </div>
  );
}
