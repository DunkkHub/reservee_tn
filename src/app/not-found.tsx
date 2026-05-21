import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-16">
      <div className="panel w-full space-y-5 p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Not found
        </p>
        <h1 className="font-heading text-4xl font-semibold text-white">
          This page does not exist anymore.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-secondary)]">
          The route may have moved, the listing may no longer be public, or the link may be incomplete.
          Use the marketplace entry points below to recover quickly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className={buttonStyles()}>
            Go home
          </Link>
          <Link href="/explore" className={buttonStyles({ variant: "secondary" })}>
            Explore businesses
          </Link>
        </div>
      </div>
    </main>
  );
}
