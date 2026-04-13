"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { PlatformProvider } from "@/components/providers/platform-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import type { AuthSession } from "@/lib/auth-types";

export function AppProviders({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: AuthSession | null;
}) {
  return (
    <PwaProvider>
      <AuthProvider initialSession={initialSession}>
        <PlatformProvider>{children}</PlatformProvider>
      </AuthProvider>
    </PwaProvider>
  );
}
