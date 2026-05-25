"use client";

import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { ApiResponse } from "@/lib/api-response";
import { authClient } from "@/lib/auth-client";
import type { AuthSession, AuthSessionUser } from "@/lib/auth-types";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthSessionUser | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession | null) => void;
  refreshSession: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: AuthSession | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(() => initialSession);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    const data = (await response.json()) as ApiResponse<{ session: AuthSession | null }>;
    const nextSession = data.data?.session ?? null;
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();

    window.localStorage.removeItem("reservee_session");
    window.localStorage.removeItem("reservee_auth");
    window.localStorage.removeItem("currentUser");
    window.localStorage.removeItem("authUser");
    window.localStorage.removeItem("user");
    window.localStorage.removeItem("auth");
    window.localStorage.removeItem("session");
    window.localStorage.removeItem("role");
    setSession(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      setSession,
      refreshSession,
      logout,
    }),
    [logout, refreshSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
