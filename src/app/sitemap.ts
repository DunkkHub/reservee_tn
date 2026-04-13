import type { MetadataRoute } from "next";

import { isBusinessLive } from "@/lib/platform-rules";
import { categories, cities, businesses } from "@/lib/seed-data";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const liveBusinesses = businesses.filter(
    (business) => isBusinessLive(business.status),
  );

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
