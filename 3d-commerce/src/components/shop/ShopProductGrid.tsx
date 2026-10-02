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

  const navigate = (patch: Partial<ShopQueryState>) => {
    const next: ShopQueryState = { ...state, page: 1, ...patch };

    startTransition(() => {
      router.replace(
        `${pathname || basePath}${buildShopSearch(next, {
          omitCategory: Boolean(lockedCategory),
        })}`,
        { scroll: false },
      );
    });
  };

  useEffect(() => {
    if (searchText.trim() === state.q.trim()) return;
    const timer = window.setTimeout(() => navigate({ q: searchText }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const filters: ShopFilterState = {
    categories: state.categories,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    minRating: state.minRating,
  };

  const handleFilterChange = (next: ShopFilterState) =>
    navigate({
      categories: lockedCategory ? [] : next.categories,
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      minRating: next.minRating,
    });

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

  const handleCategoryChange = (categorySlug: string) => {
    if (lockedCategory) return;

    navigate({
      categories: state.categories.includes(categorySlug)
        ? state.categories.filter((item) => item !== categorySlug)
        : [...state.categories, categorySlug],
    });
  };

  const handlePageChange = (page: number) => {
    navigate({ page });
    navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
                <ShopSearch value={searchText} onChange={setSearchText} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-center xl:shrink-0">
                <div className="hidden lg:block">
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
                  className="rounded-full lg:hidden"
                >
                  Filters
                </Button>
                <ShopSort
                  value={state.sort}
                  onChange={(sort: ShopSortValue) => navigate({ sort })}
                />
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-10 rounded-full border border-primary/45 px-4 text-[10px] font-medium uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/[0.07]"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div ref={navRef} className="-mx-1 mb-7 mt-7 scroll-mt-24 sm:mb-8 sm:mt-8">
            <ShopNavigation
              categories={categories}
              selectedCategories={state.categories}
              onCategoryChange={handleCategoryChange}
              onShowAll={clearAll}
              activeCategory={lockedCategory}
            />
          </div>

          <div className="mt-8 sm:mt-9" aria-busy={isPending}>
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
                <Pagination page={page} totalPages={result.totalPages} onChange={handlePageChange} />
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
        onClear={clearFilters}
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
