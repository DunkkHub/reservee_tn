"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, LogOut, ShieldCheck, Store } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { messages } = useLocale();
  const adminLinks = [
    { href: "/admin", label: messages.adminShell.moderation, icon: ShieldCheck },
    { href: "/dashboard", label: messages.adminShell.businessView, icon: Store },
    { href: "/", label: messages.adminShell.marketplace, icon: Home },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,250,243,0.92),rgba(247,239,228,0.98))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="panel grid-sheen flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark label="AD" />
            <div>
              <p className="font-heading text-xl font-semibold text-[var(--color-foreground)]">
                Reservee Admin
              </p>
              <p className="text-sm text-[var(--color-secondary)]">
                {user?.name
                  ? `${user.name} / ${messages.adminShell.subtitle}`
                  : messages.adminShell.subtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                      : "border border-[var(--color-border)] bg-[rgba(255,253,248,0.58)] text-[var(--color-secondary)] hover:text-[var(--color-accent)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut className="h-4 w-4" />}
              onClick={logout}
            >
              {messages.shell.logout}
            </Button>
          </div>
        </header>
        <div className="panel flex items-center gap-3 px-5 py-4 text-sm text-[var(--color-secondary)]">
          <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" />
          {messages.adminShell.persistenceNote}
        </div>
        {children}
      </div>
    </div>
  );
}
