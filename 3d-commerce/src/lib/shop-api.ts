import type { ShopCategory } from "@/lib/category-api";
import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProducts, type CatalogProduct } from "@/lib/catalog-api";
import { SHOP_PAGE_SIZE, type ShopQueryState } from "@/lib/shop-query";

export interface ShopPageResult {
  items: ReturnType<typeof mapCatalogProducts>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  fallbackFor?: string;
}

interface ShopPageResponse {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function request(s: ShopQueryState, categories: string[], q: string) {
  const params = new URLSearchParams({
    page: String(s.page),
    limit: String(SHOP_PAGE_SIZE),
    sort: s.sort,
  });

  if (q) params.set("q", q);
  if (categories.length) params.set("category", categories.join(","));
  if (s.minPrice > 0) params.set("minPrice", String(s.minPrice));
  if (Number.isFinite(s.maxPrice)) params.set("maxPrice", String(s.maxPrice));
  if (s.minRating > 0) params.set("minRating", String(s.minRating));

  const response = await fetch(
    getBackendApiUrl("products/shop?" + params.toString()),
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error("Shop request failed with " + response.status);
  }

  return (await response.json()) as ShopPageResponse;
}

function findSearchCategory(query: string, categories: ShopCategory[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return (
    categories.find((category) => {
      const name = category.name.trim().toLowerCase();
      const slug = category.slug.trim().toLowerCase();

      return (
        normalized === name ||
        normalized === slug ||
        normalized.includes(name) ||
        normalized.includes(slug)
      );
    }) ?? null
  );
}

export async function fetchShopPage(
  s: ShopQueryState,
  lockedCategory?: string,
  availableCategories: ShopCategory[] = [],
): Promise<ShopPageResult | null> {
  const categoryValues = lockedCategory ? [lockedCategory] : s.categories;

  try {
    let data = await request(s, categoryValues, s.q.trim());
    let fallbackFor: string | undefined;

    if (data.total === 0 && s.q.trim()) {
      const fallback = findSearchCategory(s.q, availableCategories);

      if (fallback) {
        data = await request(s, [fallback.slug], "");
        if (data.total > 0) fallbackFor = s.q.trim();
      }
    }

    return {
      items: mapCatalogProducts(data.items ?? []),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
      fallbackFor,
    };
  } catch {
    return null;
  }
}
