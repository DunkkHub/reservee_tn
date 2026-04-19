"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextValue {
  canInstall: boolean;
  installPwa: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/sw.js");
      } else {
        void (async () => {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const hadRegistrations = registrations.length > 0;

          await Promise.all(
            registrations.map((registration) => registration.unregister()),
          );

          let hadCaches = false;
          if ("caches" in window) {
            const cacheKeys = await window.caches.keys();
            hadCaches = cacheKeys.length > 0;
            await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
          }

          if (
            (hadRegistrations || hadCaches) &&
            !window.sessionStorage.getItem("reservee-dev-runtime-reset")
          ) {
            window.sessionStorage.setItem("reservee-dev-runtime-reset", "1");
            window.location.reload();
          }
        })();
      }
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installPwa() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <PwaContext.Provider
      value={{
        canInstall: Boolean(installEvent),
        installPwa,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used within PwaProvider");
  }

  return context;
}
