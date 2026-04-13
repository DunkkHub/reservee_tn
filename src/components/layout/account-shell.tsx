"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Compass, Home, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";

const accountLinks = [
  { href: "/account", label: "Overview", icon: UserRound },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/manage-booking", label: "Manage booking", icon: CalendarClock },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,169,107,0.1),transparent_28%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark label="RT" />
              <div>
                <p className="font-heading text-xl font-semibold text-white">
                  {user?.name ?? "Reservee TN"}
                </p>
                <p className="text-sm text-[var(--color-secondary)]">
                  Customer account and booking management
                </p>
              </div>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {accountLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                      : "border border-white/10 bg-white/5 text-[var(--color-secondary)] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--color-secondary)] transition hover:text-white"
            >
              <Home className="h-4 w-4" />
              Marketplace
            </Link>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut className="h-4 w-4" />}
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
