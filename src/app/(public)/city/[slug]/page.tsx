import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ExploreBrowser } from "@/components/pages/explore-browser";
import { cities } from "@/lib/seed-data";

export default async function CityPage(props: PageProps<"/city/[slug]">) {
  const { slug } = await props.params;
  const city = cities.find((item) => item.slug === slug);

  if (!city) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="panel p-6 text-sm text-[var(--color-secondary)]">Loading city listings...</div>}>
      <ExploreBrowser
        title={`Beauty bookings in ${city.name}`}
        description={city.heroCopy}
        presetCitySlug={city.slug}
      />
    </Suspense>
  );
}
