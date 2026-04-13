"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/explore", label: "Explorer" },
  { href: "/manage-booking", label: "Gerer ma reservation" },
  { href: "/partner", label: "Partenaires" },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const accountHref =
    user?.role === "shop"
      ? "/dashboard"
      : user?.role === "admin"
        ? "/admin"
        : "/account";
  const accountLabel =
    user?.role === "shop"
      ? "Dashboard"
      : user?.role === "admin"
        ? "Admin"
        : "Mon compte";
  const mobileItems = isAuthenticated
    ? [
        { href: "/", label: "Home", icon: Home },
        { href: "/explore", label: "Explore", icon: Compass },
        {
          href: accountHref,
          label: user?.role === "customer" ? "Account" : accountLabel,
          icon:
            user?.role === "customer"
              ? UserRound
              : user?.role === "admin"
                ? ShieldCheck
                : LayoutDashboard,
        },
        {
          href: user?.role === "customer" ? "/manage-booking" : "/partner",
          label: user?.role === "customer" ? "Manage" : "Partner",
          icon: user?.role === "customer" ? CalendarClock : PlusCircle,
        },
      ]
    : [
        { href: "/", label: "Home", icon: Home },
        { href: "/explore", label: "Explore", icon: Compass },
        { href: "/manage-booking", label: "Manage", icon: CalendarClock },
        { href: "/partner", label: "Partner", icon: PlusCircle },
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
                Booking premium beaute
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/4 p-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  pathname === item.href
                    ? "bg-white text-[var(--color-ink)]"
                    : "text-[var(--color-secondary)] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isHydrated && isAuthenticated ? (
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
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-[var(--color-secondary)] transition hover:text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link href="/register?role=shop">
                  <Button size="sm">Ajouter mon business</Button>
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
                    ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
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
