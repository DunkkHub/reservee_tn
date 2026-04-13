import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-accent)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-xl text-sm leading-7 text-[var(--color-secondary)] md:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
