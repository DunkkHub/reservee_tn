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
import { Button } from "@/components/ui/button";
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(200,169,107,0.14),transparent_45%),radial-gradient(circle_at_top_right,rgba(77,157,224,0.09),transparent_28%)]" />
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[rgba(15,17,21,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark label="RT" />
            <div>
              <p className="font-heading text-base font-semibold text-white">
                Reservee TN
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {messages.shell.tagline}
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-[rgba(255,255,255,0.03)] p-1.5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                  pathname === item.href
                    ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_8px_22px_rgba(200,169,107,0.35)]"
                    : "text-[rgba(241,245,252,0.86)] hover:bg-white/8 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="shrink-0" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href={accountHref}
                  className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)] transition hover:text-white"
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
                  className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)] transition hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  {messages.shell.login}
                </Link>
                <Link href="/register?role=shop">
                  <Button size="sm">{messages.shell.addBusiness}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/8 bg-[rgba(15,17,21,0.94)] px-3 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between rounded-full border border-white/8 bg-white/4 px-2 py-2">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[92px] flex-col items-center gap-1 rounded-full px-4 py-2 text-xs font-medium transition",
                  active
                    ? "bg-[rgba(200,169,107,0.95)] text-[var(--color-ink)]"
                    : "text-[var(--color-secondary)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
