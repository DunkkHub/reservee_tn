"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Camera,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  TimerReset,
  WandSparkles,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { usePlatform } from "@/components/providers/platform-provider";
import { cn } from "@/lib/utils";

const dashboardLinks = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/onboarding", label: "Onboarding", icon: WandSparkles },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/services", label: "Services", icon: Sparkles },
  { href: "/dashboard/availability", label: "Disponibilite", icon: Gauge },
  { href: "/dashboard/gallery", label: "Galerie", icon: Camera },
  { href: "/dashboard/insights", label: "Insights", icon: TimerReset },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { ownerBusiness, resetDemo } = usePlatform();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,169,107,0.1),transparent_30%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <aside className="panel sticky top-4 hidden h-[calc(100vh-2rem)] flex-col justify-between p-5 lg:flex">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark label={ownerBusiness?.logoText ?? "RT"} />
              <div>
                <p className="font-heading text-lg font-semibold text-white">
                  {ownerBusiness?.name ?? user?.businessName ?? "Reservee TN"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {user?.name ? `${user.name} / business dashboard` : "Business dashboard"}
                </p>
              </div>
            </Link>
            <div className="rounded-3xl border border-white/6 bg-white/4 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Profil completion
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {ownerBusiness?.profileCompletion ?? 0}%
              </p>
              <div className="mt-4 h-2 rounded-full bg-white/7">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${ownerBusiness?.profileCompletion ?? 0}%` }}
                />
              </div>
            </div>
            <nav className="space-y-1">
              {dashboardLinks.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[rgba(200,169,107,0.16)] text-[var(--color-accent)]"
                        : "text-[var(--color-secondary)] hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="space-y-3">
            <Link
              href="/"
              className="panel flex items-center gap-3 px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-white"
            >
              <Home className="h-4 w-4" />
              Ouvrir la marketplace
            </Link>
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className="panel flex items-center gap-3 px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                Ouvrir le panneau admin
              </Link>
            ) : null}
            <Button variant="secondary" fullWidth onClick={resetDemo}>
              Reset demo
            </Button>
            <Button
              variant="ghost"
              fullWidth
              icon={<LogOut className="h-4 w-4" />}
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </aside>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark label={ownerBusiness?.logoText ?? "RT"} />
              <div>
                <p className="font-heading text-base font-semibold text-white">
                  {ownerBusiness?.name ?? user?.businessName ?? "Reservee TN"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {user?.name ? `${user.name} / dashboard` : "Dashboard"}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={resetDemo}>
                Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
          <div className="grid gap-2 overflow-x-auto rounded-3xl border border-white/8 bg-white/4 p-2 sm:grid-cols-3 lg:hidden">
            {dashboardLinks.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-center text-xs font-medium",
                    active
                      ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                      : "text-[var(--color-secondary)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="min-h-[calc(100vh-3rem)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
