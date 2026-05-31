import { cn } from "@/lib/utils";

interface LogoMarkProps {
  label: string;
  className?: string;
  brand?: boolean;
}

export function LogoMark({ label, className, brand = false }: LogoMarkProps) {
  if (brand) {
    return (
      <div
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] bg-[#030303] text-[#f2c86f] shadow-[0_14px_30px_rgba(22,12,4,0.22)] ring-1 ring-[#f2c86f]/25 transition-transform duration-200 ease-[var(--ease-premium)] group-hover:-translate-y-0.5 group-hover:scale-[1.02]",
          className,
        )}
        aria-label={label}
      >
        <svg
          aria-hidden="true"
          className="h-[82%] w-[82%]"
          viewBox="0 0 128 128"
          fill="none"
        >
          <path
            d="M34 28H94C104 28 112 36 112 46V91C112 102 103 111 92 111H36C25 111 16 102 16 91V46C16 36 24 28 34 28Z"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M44 18V35M84 18V35M54 28H74"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M73 50H86C101 50 111 58 111 72C111 85 101 94 86 94H69L104 113"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M70 94C80 94 87 101 94 113"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M66 69C72 66 76 61 78 53C80 61 84 66 91 69C84 72 80 77 78 85C76 77 72 72 66 69Z"
            fill="currentColor"
          />
          <rect x="34" y="50" width="9" height="9" rx="2" fill="currentColor" />
          <rect x="53" y="50" width="9" height="9" rx="2" fill="currentColor" />
          <rect x="34" y="69" width="9" height="9" rx="2" fill="currentColor" />
          <rect x="53" y="69" width="9" height="9" rx="2" fill="currentColor" />
          <rect x="34" y="88" width="9" height="9" rx="2" fill="currentColor" />
          <rect x="53" y="88" width="9" height="9" rx="2" fill="currentColor" />
        </svg>
        <span className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      </div>
    );
  }

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
