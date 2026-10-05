import { getBackendApiUrl } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/media-url";

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  _count?: { products: number };
}

export async function fetchShopCategories(): Promise<ShopCategory[]> {
  try {
    const response = await fetch(
      getBackendApiUrl("categories?includeInactive=false"),
      { next: { revalidate: 60 } },
    );

    if (!response.ok) return [];

    const data: unknown = await response.json();

    if (!Array.isArray(data)) return [];

    return data
      .filter(
        (category): category is ShopCategory =>
          typeof category === "object" &&
          category !== null &&
          typeof (category as { id?: unknown }).id === "string" &&
          typeof (category as { name?: unknown }).name === "string" &&
          typeof (category as { slug?: unknown }).slug === "string",
      )
      .map((category) => ({
        ...category,
        imageUrl: resolveMediaUrl(category.imageUrl),
      }));
  } catch {
    return [];
  }
}
