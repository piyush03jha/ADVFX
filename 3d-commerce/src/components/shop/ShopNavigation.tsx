"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import type { ShopCategory } from "@/lib/category-api";
import { resolveMediaUrl } from "@/lib/media-url";
import { getActiveMainCategory, getMainCategories, getSubcategories } from "@/lib/category-hierarchy.mjs";

interface ShopNavigationProps {
  categories: ShopCategory[];
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
  onShowAll: () => void;
  activeCategory?: string;
}

export function ShopNavigation({
  categories,
  selectedCategories,
  onCategoryChange,
  onShowAll,
}: ShopNavigationProps) {
  const allActive = selectedCategories.length === 0;
  const roots = getMainCategories(categories);
  const selectedSlug = selectedCategories[0] ?? "";
  const activeRoot = getActiveMainCategory(categories, selectedSlug);
  const visibleSubcategories = activeRoot ? getSubcategories(categories, activeRoot.id) : [];
  const railRef = useRef<HTMLDivElement>(null);

  // Mouse users cannot swipe the hidden-scrollbar rail, so desktop gets arrows.
  const scrollRail = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  return (
    <section aria-label="Product categories">
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollRail(-1)}
          aria-label="Scroll categories left"
          className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-md transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary desk:flex"
        >
          <IconChevronLeft size={18} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => scrollRail(1)}
          aria-label="Scroll categories right"
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-md transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary desk:flex"
        >
          <IconChevronRight size={18} stroke={1.8} />
        </button>
      <div
        ref={railRef}
        className="-mx-3 flex w-full flex-nowrap items-stretch gap-3 overflow-x-auto px-3 pb-2 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [scrollbar-width:none] desk:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main categories"
      >
        <CategoryCard active={allActive} onClick={onShowAll} label="All Models">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-surface-elevated" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/70 text-primary shadow-sm">
              <IconPlus size={19} stroke={1.8} />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-sm font-semibold text-foreground">All Models</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted">Full collection</p>
          </div>
        </CategoryCard>

        {roots.map((category) => {
          const image = resolveMediaUrl(category.imageUrl);
          const active = selectedCategories.includes(category.slug);
          return (
            <CategoryCard
              key={category.id}
              active={active}
              onClick={() => onCategoryChange(category.slug)}
              label={category.name}
            >
              {image ? (
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-surface-elevated" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/0" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="line-clamp-2 text-left text-sm font-semibold leading-5 text-white">{category.name}</p>
                {category.description ? (
                  <p className="mt-1 line-clamp-2 text-left text-[10px] leading-4 text-white/75">{category.description}</p>
                ) : null}
              </div>
            </CategoryCard>
          );
        })}
      </div>
      </div>

      {activeRoot && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={`${activeRoot.name} subcategories`}>
          {visibleSubcategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategories.includes(category.slug)}
              onClick={() => onCategoryChange(category.slug)}
              className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors sm:min-h-9 ${selectedCategories.includes(category.slug) ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:border-primary/40"}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryCard({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group relative h-[160px] w-[132px] shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 sm:h-[212px] sm:w-[164px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${active ? "border-primary shadow-[0_0_0_1px_rgba(139,92,246,0.3)]" : "border-border/70 hover:border-primary/45"}`}
    >
      {children}
    </button>
  );
}
