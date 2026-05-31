import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonStyleOptions {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "cta-shine border border-[rgba(255,255,255,0.48)] bg-[linear-gradient(135deg,var(--color-accent),#1a8b7b_48%,var(--color-accent-soft))] text-[var(--color-ink)] shadow-[0_14px_34px_rgba(22,116,102,0.18)] hover:shadow-[0_18px_42px_rgba(22,116,102,0.24)]",
  secondary:
    "border border-[var(--color-border)] bg-[rgba(255,253,248,0.7)] text-[var(--color-foreground)] shadow-[0_10px_24px_rgba(72,49,31,0.06)] hover:border-[var(--color-border-strong)] hover:bg-[rgba(255,253,248,0.96)]",
  ghost:
    "text-[var(--color-foreground)] hover:bg-[rgba(22,116,102,0.07)] hover:text-[var(--color-accent)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonStyles({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
}: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-[transform,box-shadow,background-color,border-color,color,filter] duration-200 ease-[var(--ease-premium)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(22,116,102,0.18)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );
}

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  fullWidth,
  icon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ className, variant, size, fullWidth })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
