import { Suspense } from "react";

import { ExploreBrowser } from "@/components/pages/explore-browser";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="panel p-6 text-sm text-[var(--color-secondary)]">Loading explore...</div>}>
      <ExploreBrowser
        title="Discover and compare beauty businesses"
        description="Search by city, category, service or business name, then filter by availability, price, audience and open-now signals."
      />
    </Suspense>
  );
}
