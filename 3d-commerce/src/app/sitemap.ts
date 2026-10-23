import type { MetadataRoute } from "next";
import { getBackendApiUrl } from "@/lib/backend-api";
import { fetchShopCategories } from "@/lib/category-api";
import { absoluteUrl } from "@/lib/site";

type SitemapProduct = {
  slug?: string | null;
  status?: string | null;
  updatedAt?: string | null;
};

function parseProducts(payload: unknown): SitemapProduct[] {
  if (Array.isArray(payload)) return payload as SitemapProduct[];
  if (payload && typeof payload === "object") {
    const value = payload as { items?: unknown; data?: unknown; products?: unknown };
    for (const candidate of [value.items, value.data, value.products]) {
      if (Array.isArray(candidate)) return candidate as SitemapProduct[];
      if (candidate && typeof candidate === "object" && Array.isArray((candidate as { items?: unknown }).items)) {
        return (candidate as { items: SitemapProduct[] }).items;
      }
    }
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/custom"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/care"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/shipping"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/refund"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const categories = await fetchShopCategories();
    for (const category of categories) {
      if (category.isActive === false || !category.slug) continue;
      entries.push({
        url: absoluteUrl(`/shop/${category.slug}`),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Public static pages remain available in the sitemap during API incidents.
  }

  try {
    // The API may return either a flat array or a paginated response depending
    // on deployment version; accept both without emitting non-product entries.
    const response = await fetch(getBackendApiUrl("products"), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const products = parseProducts(await response.json());
      for (const product of products) {
        if (!product.slug || product.status !== "ACTIVE") continue;
        entries.push({
          url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`),
          ...(product.updatedAt && !Number.isNaN(Date.parse(product.updatedAt))
            ? { lastModified: new Date(product.updatedAt) }
            : {}),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Do not fail the complete sitemap when the catalog API is temporarily down.
  }

  // Defensive de-duplication protects Google from repeated category/product URLs.
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) unique.set(entry.url, entry);
  return [...unique.values()];
}
