"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconPackageOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Pagination } from "@/components/ui/Pagination";
import {
  shopCategories,
  getDiscoveryFallbackCategory,
} from "@/config/shop-categories";
import { mapCatalogProducts, type CatalogProduct, type StorefrontProduct } from "@/lib/catalog-api";

import { MobileFilters } from "./MobileFilters";
import { ShopFilters, type ShopFilterState } from "./ShopFilters";
import { ShopHeader } from "./ShopHeader";
import { ShopNavigation } from "./ShopNavigation";
import { ShopProductCard } from "./ShopProductCard";
import { ShopSearch } from "./ShopSearch";

const INITIAL_FILTERS: ShopFilterState = {
  categories: [],
  minPrice: 0,
  maxPrice: Infinity,
  minRating: 0,
};

const categoryIdToProductCategory: Record<string, string> = {
  gaming: "Gaming",
  anime: "Anime",
  "desk-toys": "Desk Toys",
  "kids-toys": "Desk Toys",
  custom: "Custom",
  heroes: "Heroes",
  props: "Weapon Props",
  display: "Display",
};

interface ShopProductGridProps {
  products?: StorefrontProduct[];
  columns?: 3 | 4;
  activeCategory?: string;
  initialSearch?: string;
  pageSize?: number;
}

export function ShopProductGrid({
  products,
  columns = 4,
  activeCategory,
  initialSearch = "",
  pageSize = 12,
}: ShopProductGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>(products ?? []);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(!products);
  const [catalogError, setCatalogError] = useState(false);
  const sourceProducts = products ?? catalogProducts;
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (products) return;

    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Catalog request failed with ${response.status}`);
        }

        const data = (await response.json()) as CatalogProduct[];

        if (!cancelled) {
          setCatalogProducts(mapCatalogProducts(Array.isArray(data) ? data : []));
          setCatalogError(false);
          setIsLoadingCatalog(false);
        }
      } catch {
        if (!cancelled) {
          setCatalogProducts([]);
          setCatalogError(true);
          setIsLoadingCatalog(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [products]);

  const [filters, setFilters] = useState<ShopFilterState>(() => ({
    ...INITIAL_FILTERS,
    categories: activeCategory ? [activeCategory] : [],
  }));
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<"featured" | "newest" | "popular" | "rating" | "price-low" | "price-high">("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilters({
      ...INITIAL_FILTERS,
      categories: activeCategory ? [activeCategory] : [],
    });
    setSearch(initialSearch);
  }, [activeCategory, initialSearch]);

  const categories = useMemo(() => {
    const available = new Set(sourceProducts.map((product) => product.category));
    return shopCategories.filter((category) => {
      const productCategory = categoryIdToProductCategory[category.id];
      return productCategory ? available.has(productCategory) : false;
    });
  }, [sourceProducts]);

  const categoryIds = useMemo(
    () => new Set(categories.map((category) => category.id)),
    [categories],
  );

  const effectiveCategoryIds = useMemo(() => {
    if (!activeCategory) return [];

    const normalized = activeCategory.toLowerCase().replace(/[_\s/]+/g, "-");
    const aliases: Record<string, string> = {
      gaming: "gaming",
      anime: "anime",
      "desk-toys": "desk-toys",
      "desk-toys-and-figures": "desk-toys",
      "kids-toys": "kids-toys",
      kids: "kids-toys",
      custom: "custom",
      heroes: "heroes",
      "weapon-props": "props",
      props: "props",
      display: "display",
    };

    return aliases[normalized] ? [aliases[normalized]] : [activeCategory];
  }, [activeCategory]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fallbackCategory = getDiscoveryFallbackCategory(query);
    const fallbackProductCategory = fallbackCategory
      ? categoryIdToProductCategory[fallbackCategory.id]
      : null;

    const directMatchExists =
      query.length > 0 &&
      sourceProducts.some((product) =>
        [product.name, product.category].some((value) =>
          value.toLowerCase().includes(query),
        ),
      );

    const selectedCategoryIds = activeCategory ? effectiveCategoryIds : filters.categories;
    const selectedProductCategories = selectedCategoryIds
      .map((id) => categoryIdToProductCategory[id])
      .filter(Boolean);

    const result = sourceProducts.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (!directMatchExists && fallbackProductCategory === product.category);

      const matchesCategory =
        selectedProductCategories.length === 0 ||
        selectedProductCategories.includes(product.category);

      const matchesPrice = product.price >= filters.minPrice && product.price <= filters.maxPrice;
      const matchesRating = product.rating >= filters.minRating;

      return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "newest":
          return sourceProducts.indexOf(b) - sourceProducts.indexOf(a);
        case "popular":
          return b.reviewCount - a.reviewCount;
        case "rating":
          return b.rating - a.rating;
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "featured":
        default:
          return 0;
      }
    });
  }, [activeCategory, effectiveCategoryIds, filters, search, sort, sourceProducts]);

  useEffect(() => {
    setPage(1);
  }, [filters, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () =>
    setFilters({
      ...INITIAL_FILTERS,
      categories: activeCategory ? [activeCategory] : [],
    });

  const clearAll = () => {
    setFilters({
      ...INITIAL_FILTERS,
      categories: activeCategory ? [activeCategory] : [],
    });
    setSearch("");
  };

  const handleCategoryChange = (categoryId: string) => {
    if (activeCategory || !categoryIds.has(categoryId)) return;

    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(categoryId)
        ? current.categories.filter((item) => item !== categoryId)
        : [...current.categories, categoryId],
    }));
  };

  const handleFilterChange = (next: ShopFilterState) => {
    setFilters(next);
  };

  return (
    <>
      <ShopHeader />

      <section className="relative pb-20 pt-0 sm:pb-24 lg:pb-28">
        <Container>
          <div className="pt-1 sm:pt-2 lg:pt-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-center">
              <div className="w-full min-w-0 xl:flex-[2]">
                <ShopSearch value={search} onChange={setSearch} />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 xl:shrink-0">
                <ShopFilters
                  categories={categories.map((category) => category.id)}
                  filters={filters}
                  onChange={handleFilterChange}
                  onClear={clearFilters}
                  compact
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

            <div className="mt-3 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="rounded-full"
              >
                Filters
              </Button>
            </div>
          </div>

          <div ref={navRef} className="-mx-1 mb-7 mt-7 scroll-mt-24 sm:mb-8 sm:mt-8">
            <ShopNavigation
              categories={categories}
              selectedCategories={filters.categories}
              onCategoryChange={handleCategoryChange}
              onShowAll={clearAll}
              activeCategory={activeCategory}
            />
          </div>

          <div className="mt-8 sm:mt-9">
            {isLoadingCatalog ? (
              <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Loading products</p>
              </div>
            ) : catalogError ? (
              <EmptyProducts onClear={clearAll} message="The catalog could not be loaded. Start the backend API and try again." />
            ) : paginatedProducts.length > 0 ? (
              <>
                <div
                  className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${
                    columns === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"
                  }`}
                >
                  {paginatedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: Math.min(index * 0.035, 0.25),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <ShopProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-center sm:mt-8">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    Showing <span className="text-foreground">{paginatedProducts.length}</span> models
                  </p>
                </div>

                <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
              </>
            ) : (
              <EmptyProducts onClear={clearAll} />
            )}
          </div>
        </Container>
      </section>

      <MobileFilters
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        categories={categories.map((category) => category.id)}
        filters={filters}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />
    </>
  );
}

function EmptyProducts({ onClear, message = "Try another product name, category, or filter combination." }: { onClear: () => void; message?: string }) {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-elevated text-muted">
        <IconPackageOff size={20} stroke={1.5} />
      </div>
      <h3 className="mt-5 text-base font-medium text-foreground">No matching models</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted">
        {message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onClear} className="mt-5">
        Clear Search &amp; Filters
      </Button>
    </div>
  );
}
