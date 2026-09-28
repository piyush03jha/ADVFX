import type { MetadataRoute } from "next";
import { getBackendApiUrl } from "@/lib/backend-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://forma3d.in";
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: base + "/shop", changeFrequency: "daily", priority: 0.9 },
    { url: base + "/custom", changeFrequency: "monthly", priority: 0.8 },
    { url: base + "/contact", changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: base + "/terms", changeFrequency: "yearly", priority: 0.2 },
    { url: base + "/refund", changeFrequency: "yearly", priority: 0.2 },
    { url: base + "/shipping", changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const response = await fetch(getBackendApiUrl("products"), { next: { revalidate: 3600 } });
    if (response.ok) {
      const products = (await response.json()) as Array<{ slug?: string; status?: string; updatedAt?: string }>;
      for (const product of products) {
        if (!product.slug || product.status === "ARCHIVED") continue;
        entries.push({
          url: base + "/product/" + product.slug,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {}

  return entries;
}
