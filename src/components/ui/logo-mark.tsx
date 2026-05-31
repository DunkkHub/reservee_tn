import { cn } from "@/lib/utils";

interface LogoMarkProps {
  label: string;
  className?: string;
}

export function LogoMark({ label, className }: LogoMarkProps) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-[rgba(22,116,102,0.2)] bg-[linear-gradient(145deg,#fffdf8_0%,#f4e2c6_52%,#b7ded7_100%)] text-sm font-bold text-[var(--color-foreground)] shadow-[0_12px_26px_rgba(72,49,31,0.13)]",
        className,
      )}
    >
      <span className="absolute -right-3 top-1 h-7 w-7 rounded-full border border-white/70 bg-white/45" />
      <span className="absolute -bottom-4 -left-2 h-8 w-8 rounded-full border border-[rgba(22,116,102,0.24)] bg-[rgba(22,116,102,0.1)]" />
      <span className="relative tracking-normal">{label}</span>
    </div>
  );
}
