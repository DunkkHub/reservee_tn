import { Suspense } from "react";

import { ExploreBrowser } from "@/components/pages/explore-browser";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="panel p-6 text-sm text-[var(--color-secondary)]">Loading...</div>}>
      <ExploreBrowser />
    </Suspense>
  );
}
