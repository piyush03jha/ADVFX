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
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: ShopCategory[];
  _count?: { products: number };
}

/**
 * Accept both flat category APIs and APIs that return roots with nested children.
 * Some deployments return a { data: [...] } envelope rather than a bare array.
 */
export function normalizeShopCategories(data: unknown): ShopCategory[] {
  const candidate = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null
      ? ((data as { categories?: unknown; data?: unknown }).categories ??
        (data as { data?: unknown }).data)
      : null;

  if (!Array.isArray(candidate)) return [];

  const flattened: ShopCategory[] = [];
  const seen = new Set<string>();

  const visit = (items: unknown[], parent?: ShopCategory) => {
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const value = item as Record<string, unknown>;
      if (
        typeof value.id !== "string" ||
        typeof value.name !== "string" ||
        typeof value.slug !== "string" ||
        seen.has(value.id)
      ) continue;

      const category = {
        ...value,
        parentId: typeof value.parentId === "string"
          ? value.parentId
          : parent?.id ?? null,
        parent: value.parent && typeof value.parent === "object"
          ? value.parent as ShopCategory["parent"]
          : parent
            ? { id: parent.id, name: parent.name, slug: parent.slug }
            : null,
        imageUrl: resolveMediaUrl(
          typeof value.imageUrl === "string" ? value.imageUrl : null,
        ),
      } as ShopCategory;

      seen.add(category.id);
      flattened.push(category);

      if (Array.isArray(value.children)) visit(value.children, category);
    }
  };

  visit(candidate);
  return flattened;
}

export async function fetchShopCategories(): Promise<ShopCategory[]> {
  try {
    const response = await fetch(
      getBackendApiUrl("categories?includeInactive=false"),
      { next: { revalidate: 60 } },
    );

    if (!response.ok) return [];

    return normalizeShopCategories(await response.json());
  } catch {
    return [];
  }
}
