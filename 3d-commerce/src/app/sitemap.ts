import type { MetadataRoute } from "next";
import { getBackendApiUrl } from "@/lib/backend-api";
import { fetchShopCategories } from "@/lib/category-api";
import { absoluteUrl } from "@/lib/site";

const STATIC_LAST_MODIFIED = new Date("2026-10-05T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/shop"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/custom"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/contact"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/shipping"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/refund"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/privacy"), lastModified: STATIC_LAST_MODIFIED },
    { url: absoluteUrl("/terms"), lastModified: STATIC_LAST_MODIFIED },
  ];

  try {
    const categories = await fetchShopCategories();
    for (const category of categories) {
      if (category.isActive === false) continue;
      entries.push({
        url: absoluteUrl(`/shop/${category.slug}`),
        lastModified: STATIC_LAST_MODIFIED,
      });
    }
  } catch {}

  try {
    const response = await fetch(getBackendApiUrl("products"), {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const products = (await response.json()) as Array<{
        slug?: string;
        status?: string;
        updatedAt?: string;
      }>;
      for (const product of products) {
        if (!product.slug || product.status !== "ACTIVE") continue;
        entries.push({
          url: absoluteUrl(`/product/${product.slug}`),
          lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
        });
      }
    }
  } catch {}

  return entries;
}