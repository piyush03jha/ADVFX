"use client";

import { IconLayoutGrid, IconPlus } from "@tabler/icons-react";
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

  return (
    <section aria-label="Product categories">
      <div
        className="-mx-3 flex w-full flex-nowrap items-stretch gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      {activeRoot && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={`${activeRoot.name} subcategories`}>
          {visibleSubcategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategories.includes(category.slug)}
              onClick={() => onCategoryChange(category.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selectedCategories.includes(category.slug) ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:border-primary/40"}`}
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
      className={`group relative h-[190px] w-[148px] shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 sm:h-[212px] sm:w-[164px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${active ? "border-primary shadow-[0_0_0_1px_rgba(139,92,246,0.3)]" : "border-border/70 hover:border-primary/45"}`}
    >
      {children}
    </button>
  );
}
