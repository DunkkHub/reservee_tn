"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { PlatformProvider } from "@/components/providers/platform-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import type { AppLocale } from "@/lib/i18n";
import type { AuthSession } from "@/lib/auth-types";

export function AppProviders({
  children,
  initialSession,
  initialLocale,
}: {
  children: ReactNode;
  initialSession: AuthSession | null;
  initialLocale: AppLocale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <PwaProvider>
        <AuthProvider initialSession={initialSession}>
          <PlatformProvider>{children}</PlatformProvider>
        </AuthProvider>
      </PwaProvider>
    </LocaleProvider>
  );
}
