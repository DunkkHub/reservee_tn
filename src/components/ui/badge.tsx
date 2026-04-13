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
  default: "border-white/10 bg-white/5 text-white/80",
  accent: "border-[color:rgba(200,169,107,0.26)] bg-[rgba(200,169,107,0.12)] text-[var(--color-accent)]",
  success: "border-[rgba(59,178,115,0.26)] bg-[rgba(59,178,115,0.14)] text-[var(--color-success)]",
  warning: "border-[rgba(240,162,2,0.26)] bg-[rgba(240,162,2,0.14)] text-[var(--color-warning)]",
  danger: "border-[rgba(225,85,84,0.26)] bg-[rgba(225,85,84,0.14)] text-[var(--color-error)]",
  muted: "border-white/8 bg-white/4 text-[var(--color-muted)]",
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
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.02em]",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
