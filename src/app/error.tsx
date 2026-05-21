"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonStyles } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-16">
      <div className="panel w-full space-y-5 p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Unexpected error
        </p>
        <h1 className="font-heading text-4xl font-semibold text-white">
          Something went wrong on this page.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
          The error has been contained so the rest of the app can keep working. Try the action
          again, or return to a stable route if the issue persists.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={buttonStyles()}>
            Try again
          </button>
          <Link href="/" className={buttonStyles({ variant: "secondary" })}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
