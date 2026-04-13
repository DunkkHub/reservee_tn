import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_12px_30px_rgba(200,169,107,0.26)] hover:bg-[var(--color-accent-soft)]",
  secondary:
    "border border-white/10 bg-white/5 text-[var(--color-foreground)] hover:border-white/20 hover:bg-white/10",
  ghost:
    "text-[var(--color-foreground)] hover:bg-white/6 hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

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
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
