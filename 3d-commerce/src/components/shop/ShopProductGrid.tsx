"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconPackageOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Pagination } from "@/components/ui/Pagination";
import type { ShopCategory } from "@/lib/category-api";
import type { ShopPageResult } from "@/lib/shop-api";
import {
  buildShopSearch,
  DEFAULT_SHOP_QUERY,
  type ShopQueryState,
} from "@/lib/shop-query";

import { MobileFilters } from "./MobileFilters";
import { ShopFilters, type ShopFilterState } from "./ShopFilters";
import { ShopHeader } from "./ShopHeader";
import { ShopNavigation } from "./ShopNavigation";
import { ShopProductCard } from "./ShopProductCard";
import { ShopSearch } from "./ShopSearch";
import { ShopSort, type ShopSortValue } from "./ShopSort";

const SHOP_ROOT = "/shop";
// ShopListing re-keys the grid on every URL change, so the search box is rebuilt
// when results arrive. This flag carries "the user was typing" across that rebuild.
const SEARCH_FOCUS_KEY = "voxel-shop-search-focus";
const categoryPath = (slug: string) => `${SHOP_ROOT}/${encodeURIComponent(slug)}`;

interface ShopProductGridProps {
  result: ShopPageResult | null;
  state: ShopQueryState;
  lockedCategory?: string;
  basePath: string;
  categories: ShopCategory[];
}

export function ShopProductGrid({
  result,
  state,
  lockedCategory,
  basePath,
  categories,
}: ShopProductGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(state.q);
  const navRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollYRef = useRef<number | null>(null);

  // A category page (/shop/<slug>) is the shop with one category selected. The
  // rail and the filter sheet must show that category and be able to change it.
  const effectiveCategories = lockedCategory ? [lockedCategory] : state.categories;

  // Page/filter/sort changes push a history entry so Back returns to the
  // previous page or filter; only the debounced search-as-you-type replaces.
  // `path` is where the navigation lands: by default the current page, or /shop
  // or another category page. A category page carries its category in the path,
  // so ?category= is only written for /shop.
  const navigate = (
    patch: Partial<ShopQueryState>,
    mode: "push" | "replace" = "push",
    path: string = pathname || basePath,
  ) => {
    const next: ShopQueryState = { ...state, page: 1, ...patch };

    startTransition(() => {
      router[mode](
        `${path}${buildShopSearch(next, { omitCategory: path !== SHOP_ROOT })}`,
        { scroll: false },
      );
    });
  };

  useEffect(() => {
    if (categoryScrollYRef.current === null) return;
    const scrollY = categoryScrollYRef.current;
    categoryScrollYRef.current = null;
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
  }, [state.categories]);

  // Put the cursor back in the search box after a search navigation rebuilt it.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEARCH_FOCUS_KEY) !== "1") return;
      window.sessionStorage.removeItem(SEARCH_FOCUS_KEY);
    } catch {
      return;
    }
    const input = searchInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  useEffect(() => {
    if (searchText.trim() === state.q.trim()) return;
    const timer = window.setTimeout(() => {
      try {
        if (document.activeElement === searchInputRef.current) {
          window.sessionStorage.setItem(SEARCH_FOCUS_KEY, "1");
        }
      } catch {
        // Private mode can block storage; the search still works without it.
      }
      // Search looks through the whole catalog. Leave a category page and drop
      // any selected category instead of searching only inside it.
      if (searchText.trim()) navigate({ q: searchText, categories: [] }, "replace", SHOP_ROOT);
      else navigate({ q: searchText }, "replace");
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const filters: ShopFilterState = {
    categories: effectiveCategories,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    minRating: state.minRating,
  };

  const handleFilterChange = (next: ShopFilterState) => {
    const patch = {
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      minRating: next.minRating,
    };
    const categoriesChanged =
      next.categories.length !== effectiveCategories.length ||
      next.categories.some((slug) => !effectiveCategories.includes(slug));

    // Price and rating filters stay on the current page. Picking different
    // categories from a category page moves to the matching page.
    if (lockedCategory && categoriesChanged) {
      navigate(
        { ...patch, categories: next.categories },
        "push",
        next.categories.length === 1 ? categoryPath(next.categories[0]) : SHOP_ROOT,
      );
      return;
    }

    navigate({ ...patch, categories: lockedCategory ? [] : next.categories });
  };

  const clearFilters = () =>
    navigate({
      categories: [],
      minPrice: DEFAULT_SHOP_QUERY.minPrice,
      maxPrice: DEFAULT_SHOP_QUERY.maxPrice,
      minRating: DEFAULT_SHOP_QUERY.minRating,
    });

  const clearAll = () => {
    setSearchText("");
    navigate({ ...DEFAULT_SHOP_QUERY, sort: state.sort });
  };

  // "All Models": the whole catalog, from /shop or from any category page.
  const showAllModels = () => {
    setSearchText("");
    navigate({ ...DEFAULT_SHOP_QUERY, sort: state.sort }, "push", SHOP_ROOT);
  };

  const handleCategoryChange = (categorySlug: string) => {
    // Preserve the current viewport while the selected category and products update.
    categoryScrollYRef.current = window.scrollY;

    // Category navigation is single-select: selecting a new category
    // replaces the previous one; selecting the active category clears it.
    if (lockedCategory) {
      navigate(
        { categories: categorySlug === lockedCategory ? [] : [categorySlug] },
        "push",
        categorySlug === lockedCategory ? SHOP_ROOT : categoryPath(categorySlug),
      );
      return;
    }

    navigate({
      categories: state.categories.includes(categorySlug) ? [] : [categorySlug],
    });
  };

  const handlePageChange = (page: number) => {
    navigate({ page });
    navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasPriceFilter = state.minPrice > 0 || Number.isFinite(state.maxPrice);
  const activeFilterCount =
    (lockedCategory ? 0 : state.categories.length) +
    (hasPriceFilter ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0);
  const hasAnythingActive = activeFilterCount > 0 || state.q.trim() !== "" || searchText.trim() !== "";

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageSize = result?.pageSize ?? 12;
  const page = result?.page ?? state.page;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + items.length;

  return (
    <>
      <ShopHeader />
      <section className="relative pb-20 pt-0 sm:pb-24 lg:pb-28">
        <Container>
          <div className="pt-1 sm:pt-2 lg:pt-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-center">
              <div className="w-full min-w-0 xl:flex-[2]">
                <ShopSearch value={searchText} onChange={setSearchText} inputRef={searchInputRef} />
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-wrap sm:justify-center xl:shrink-0">
                <div className="hidden desk:block">
                  <ShopFilters
                    filters={filters}
                    onChange={handleFilterChange}
                    onClear={clearFilters}
                    compact
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="relative min-h-11 rounded-full desk:hidden"
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <ShopSort
                  value={state.sort}
                  onChange={(sort: ShopSortValue) => navigate({ sort })}
                />
                {(state.categories.length > 0 || state.minPrice > 0 || Number.isFinite(state.maxPrice) || state.minRating > 0 || state.q.trim() !== "" || searchText.trim() !== "") && (
                  <button type="button" onClick={clearAll} className="col-span-2 h-10 rounded-full border border-primary/45 px-4 text-[11px] font-medium uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/[0.07]">Clear filters</button>
                )}
              </div>
            </div>
          </div>

          <div ref={navRef} className="mb-5 mt-5 scroll-mt-24 sm:mb-8 sm:mt-8">
            <ShopNavigation
              categories={categories}
              selectedCategories={effectiveCategories}
              onCategoryChange={handleCategoryChange}
              onShowAll={showAllModels}
              activeCategory={lockedCategory}
            />
          </div>

          <div className="mt-5 sm:mt-9" aria-busy={isPending}>
            {result === null ? (
              <EmptyProducts
                onClear={clearAll}
                message="The catalog could not be loaded. Please try again in a moment."
              />
            ) : items.length > 0 ? (
              <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
                {result.fallbackFor ? (
                  <p className="mb-4 text-center text-xs text-muted">
                    No exact match for &ldquo;{result.fallbackFor}&rdquo; &mdash; showing similar models.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((product, index) => (
                    <ShopProductCard key={product.id} product={product} priority={index < 4} />
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-center sm:mt-8">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted" aria-live="polite">
                    Showing <span className="text-foreground">{rangeStart}&ndash;{rangeEnd}</span> of{" "}
                    <span className="text-foreground">{total}</span> models
                  </p>
                </div>
                <Pagination
                  page={page}
                  totalPages={result.totalPages}
                  onChange={handlePageChange}
                  getHref={(target) =>
                    `${pathname || basePath}${buildShopSearch(
                      { ...state, page: target },
                      { omitCategory: Boolean(lockedCategory) },
                    )}`
                  }
                />
              </div>
            ) : (
              <EmptyProducts onClear={clearAll} />
            )}
          </div>
        </Container>
      </section>

      <MobileFilters
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        categories={categories}
        filters={filters}
        onChange={handleFilterChange}
      />
    </>
  );
}

function EmptyProducts({
  onClear,
  message = "Try another product name, category, or filter combination.",
}: {
  onClear: () => void;
  message?: string;
}) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-elevated text-muted">
        <IconPackageOff size={20} stroke={1.5} />
      </div>
      <h3 className="mt-5 text-base font-medium text-foreground">No matching models</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onClear} className="mt-5">
        Clear Search &amp; Filters
      </Button>
    </div>
  );
}
