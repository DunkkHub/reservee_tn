import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  default: "border-[var(--color-border)] bg-[rgba(255,253,248,0.72)] text-[var(--color-secondary)]",
  accent: "border-[rgba(22,116,102,0.2)] bg-[rgba(22,116,102,0.09)] text-[var(--color-accent)]",
  success: "border-[rgba(38,122,82,0.22)] bg-[rgba(38,122,82,0.09)] text-[var(--color-success)]",
  warning: "border-[rgba(147,99,16,0.22)] bg-[rgba(231,201,147,0.24)] text-[var(--color-warning)]",
  danger: "border-[rgba(183,67,54,0.22)] bg-[rgba(183,67,54,0.09)] text-[var(--color-error)]",
  muted: "border-[var(--color-border)] bg-[rgba(255,253,248,0.52)] text-[var(--color-muted)]",
};

export function Badge({
  className,
  tone = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.02em] shadow-[0_6px_18px_rgba(72,49,31,0.05)] transition-colors duration-200",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
