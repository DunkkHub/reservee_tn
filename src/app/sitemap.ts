import type { MetadataRoute } from "next";

import { findPublicBusinesses } from "@/lib/business-repository";
import { isBusinessLive } from "@/lib/platform-rules";
import { siteUrl } from "@/lib/site";
import { categories, cities } from "@/lib/taxonomy";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const liveBusinesses = await findPublicBusinesses()
    .then((businesses) => businesses.filter((business) => isBusinessLive(business.status)))
    .catch(() => []);

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/explore`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/partner`,
      lastModified: new Date(),
    },
    ...categories.map((category) => ({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: new Date(),
    })),
    ...cities.map((city) => ({
      url: `${siteUrl}/city/${city.slug}`,
      lastModified: new Date(),
    })),
    ...liveBusinesses.map((business) => ({
      url: `${siteUrl}/business/${business.slug}`,
      lastModified: new Date(business.createdAt),
    })),
  ];
}
