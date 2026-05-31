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
import { useLocale } from "@/components/providers/locale-provider";
import { usePlatform } from "@/components/providers/platform-provider";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { messages } = useLocale();
  const { ownerBusiness, refreshData } = usePlatform();
  const dashboardLinks = [
    { href: "/dashboard", label: messages.dashboardShell.overview, icon: LayoutDashboard },
    { href: "/dashboard/onboarding", label: messages.dashboardShell.onboarding, icon: WandSparkles },
    { href: "/dashboard/bookings", label: messages.dashboardShell.bookings, icon: CalendarDays },
    { href: "/dashboard/services", label: messages.dashboardShell.services, icon: Sparkles },
    { href: "/dashboard/availability", label: messages.dashboardShell.availability, icon: Gauge },
    { href: "/dashboard/gallery", label: messages.dashboardShell.gallery, icon: Camera },
    { href: "/dashboard/insights", label: messages.dashboardShell.insights, icon: TimerReset },
    { href: "/dashboard/settings", label: messages.dashboardShell.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,250,243,0.92),rgba(247,239,228,0.98))]">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <aside className="panel grid-sheen sticky top-4 hidden h-[calc(100vh-2rem)] flex-col justify-between p-5 lg:flex">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark
                label={ownerBusiness?.logoText ?? "Reservee_TN"}
                brand={!ownerBusiness}
              />
              <div>
                <p className="font-heading text-lg font-semibold text-[var(--color-foreground)]">
                  {ownerBusiness?.name ?? user?.businessName ?? "Reservee_TN"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {user?.name
                    ? `${user.name} / ${messages.dashboardShell.subtitle}`
                    : messages.dashboardShell.subtitle}
                </p>
              </div>
            </Link>
            <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,250,240,0.045)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {messages.dashboardShell.profileCompletion}
              </p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
                {ownerBusiness?.profileCompletion ?? 0}%
              </p>
              <div className="mt-4 h-2 rounded-full bg-[rgba(255,250,240,0.08)]">
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
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[rgba(22,116,102,0.09)] text-[var(--color-accent)] shadow-[inset_3px_0_0_var(--color-accent)]"
                        : "text-[var(--color-secondary)] hover:bg-[rgba(22,116,102,0.06)] hover:text-[var(--color-accent)]",
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
              className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[rgba(255,253,248,0.58)] px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-[var(--color-accent)]"
            >
              <Home className="h-4 w-4" />
              {messages.dashboardShell.openMarketplace}
            </Link>
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[rgba(255,253,248,0.58)] px-4 py-3 text-sm text-[var(--color-secondary)] transition hover:text-[var(--color-accent)]"
              >
                <ShieldCheck className="h-4 w-4" />
                {messages.dashboardShell.openAdmin}
              </Link>
            ) : null}
            <Button variant="secondary" fullWidth onClick={() => void refreshData()}>
              {messages.dashboardShell.refreshData}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              icon={<LogOut className="h-4 w-4" />}
              onClick={logout}
            >
              {messages.shell.logout}
            </Button>
          </div>
        </aside>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark
                label={ownerBusiness?.logoText ?? "Reservee_TN"}
                brand={!ownerBusiness}
              />
              <div>
                <p className="font-heading text-base font-semibold text-[var(--color-foreground)]">
                  {ownerBusiness?.name ?? user?.businessName ?? "Reservee_TN"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {user?.name
                    ? `${user.name} / ${messages.dashboardShell.mobileSubtitle}`
                    : messages.dashboardShell.mobileSubtitle}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void refreshData()}>
                {messages.dashboardShell.refresh}
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                {messages.shell.logout}
              </Button>
            </div>
          </div>
          <div className="grid gap-2 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[rgba(255,253,248,0.7)] p-2 sm:grid-cols-3 lg:hidden">
            {dashboardLinks.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-center text-xs font-medium",
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
