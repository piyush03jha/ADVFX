import type { MetadataRoute } from "next";
import { getBackendApiUrl } from "@/lib/backend-api";
import { fetchShopCategories } from "@/lib/category-api";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/custom"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/shipping"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/refund"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const categories = await fetchShopCategories();
    for (const category of categories) {
      if (category.isActive === false || !category.slug) continue;
      entries.push({ url: absoluteUrl(`/shop/${category.slug}`), changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {}

  try {
    const response = await fetch(getBackendApiUrl("products"), { next: { revalidate: 3600 } });
    if (response.ok) {
      const products = (await response.json()) as Array<{ slug?: string; status?: string; updatedAt?: string }>;
      for (const product of products) {
        if (!product.slug || product.status !== "ACTIVE") continue;
        entries.push({
          url: absoluteUrl(`/product/${product.slug}`),
          lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {}

  return entries;
}
