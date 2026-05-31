"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  Compass,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  PlusCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { messages } = useLocale();
  const navItems = useMemo(
    () => [
      { href: "/", label: messages.shell.home },
      { href: "/explore", label: messages.shell.explore },
      { href: "/manage-booking", label: messages.shell.manageBooking },
      { href: "/partner", label: messages.shell.partners },
    ],
    [messages],
  );

  useEffect(() => {
    for (const item of navItems) {
      if (item.href !== pathname) {
        router.prefetch(item.href);
      }
    }
  }, [navItems, pathname, router]);

  const accountHref =
    user?.role === "shop"
      ? "/dashboard"
      : user?.role === "admin"
        ? "/admin"
        : "/account";
  const accountLabel =
    user?.role === "shop"
      ? messages.shell.dashboard
      : user?.role === "admin"
        ? messages.shell.admin
        : messages.shell.account;
  const mobileItems = isAuthenticated
    ? [
        { href: "/", label: messages.shell.home, icon: Home },
        { href: "/explore", label: messages.shell.explore, icon: Compass },
        {
          href: accountHref,
          label: user?.role === "customer" ? messages.shell.account : accountLabel,
          icon:
            user?.role === "customer"
              ? UserRound
              : user?.role === "admin"
                ? ShieldCheck
                : LayoutDashboard,
        },
        {
          href: user?.role === "customer" ? "/manage-booking" : "/partner",
          label:
            user?.role === "customer"
              ? messages.shell.manageBooking
              : messages.shell.partners,
          icon: user?.role === "customer" ? CalendarClock : PlusCircle,
        },
      ]
    : [
        { href: "/", label: messages.shell.home, icon: Home },
        { href: "/explore", label: messages.shell.explore, icon: Compass },
        {
          href: "/manage-booking",
          label: messages.shell.manageBooking,
          icon: CalendarClock,
        },
        { href: "/partner", label: messages.shell.partners, icon: PlusCircle },
      ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[rgba(54,43,35,0.08)] bg-[rgba(255,250,243,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <LogoMark label="RT" />
            <div>
              <p className="font-heading text-base font-semibold text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-accent)]">
                Reservee TN
              </p>
              <p className="hidden text-xs text-[var(--color-muted)] sm:block">
                {messages.shell.tagline}
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full bg-[rgba(255,253,248,0.62)] p-1 shadow-[inset_0_0_0_1px_rgba(54,43,35,0.08),0_10px_24px_rgba(72,49,31,0.06)] md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-premium)] hover:-translate-y-0.5",
                  pathname === item.href
                    ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_8px_22px_rgba(22,116,102,0.18)]"
                    : "text-[var(--color-secondary)] hover:bg-[rgba(22,116,102,0.07)] hover:text-[var(--color-accent)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher className="shrink-0" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher className="shrink-0" />
            {isAuthenticated ? (
              <>
                <Link
                  href={accountHref}
                  className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-[var(--color-secondary)] transition-colors hover:text-[var(--color-accent)]"
                >
                  {user?.role === "admin" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : user?.role === "shop" ? (
                    <LayoutDashboard className="h-4 w-4" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  {accountLabel}
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<LogOut className="h-4 w-4" />}
                  onClick={logout}
                >
                  {messages.shell.logout}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-[var(--color-secondary)] transition-colors hover:text-[var(--color-accent)]"
                >
                  <LogIn className="h-4 w-4" />
                  {messages.shell.login}
                </Link>
                <Link
                  href="/register?role=shop"
                  className={buttonStyles({ size: "sm" })}
                >
                  {messages.shell.addBusiness}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
        {children}
      </main>
      <footer className="hidden border-t border-[rgba(54,43,35,0.08)] bg-[rgba(255,250,243,0.72)] md:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-8">
          <div className="flex items-center gap-3">
            <LogoMark label="RT" />
            <div>
              <p className="font-heading font-semibold text-[var(--color-foreground)]">Reservee TN</p>
              <p className="text-sm text-[var(--color-muted)]">{messages.shell.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-[var(--color-secondary)]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-[var(--color-accent)]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgba(54,43,35,0.08)] bg-[rgba(255,250,243,0.94)] px-3 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-1 rounded-full border border-[var(--color-border)] bg-[rgba(255,253,248,0.86)] px-2 py-2 shadow-[0_-10px_30px_rgba(72,49,31,0.08)]">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition",
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_8px_16px_rgba(22,116,102,0.14)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-accent)]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
