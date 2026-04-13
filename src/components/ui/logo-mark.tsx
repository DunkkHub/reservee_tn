import { cn } from "@/lib/utils";

interface LogoMarkProps {
  label: string;
  className?: string;
}

export function LogoMark({ label, className }: LogoMarkProps) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(200,169,107,0.22),rgba(217,167,160,0.1))] text-sm font-semibold text-[var(--color-foreground)] shadow-[0_10px_25px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      {label}
    </div>
  );
}
