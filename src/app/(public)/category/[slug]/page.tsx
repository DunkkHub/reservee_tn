import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ExploreBrowser } from "@/components/pages/explore-browser";
import { categories } from "@/lib/seed-data";

export default async function CategoryPage(props: PageProps<"/category/[slug]">) {
  const { slug } = await props.params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="panel p-6 text-sm text-[var(--color-secondary)]">Loading...</div>}>
      <ExploreBrowser presetCategorySlug={category.slug} />
    </Suspense>
  );
}
