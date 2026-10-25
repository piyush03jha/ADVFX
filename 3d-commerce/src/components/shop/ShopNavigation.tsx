"use client";

import { IconLayoutGrid } from "@tabler/icons-react";
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
        className="-mx-3 flex w-full flex-nowrap items-center gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main categories"
      >
        <Chip active={allActive} onClick={onShowAll}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconLayoutGrid size={15} stroke={1.8} />
          </span>
          All models
        </Chip>
        {roots.map((category) => {
          const image = resolveMediaUrl(category.imageUrl);
          return (
            <Chip
              key={category.id}
              active={selectedCategories.includes(category.slug)}
              onClick={() => onCategoryChange(category.slug)}
            >
              {image ? (
                <img src={image} alt="" loading="lazy" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="h-7 w-7 shrink-0 rounded-full bg-surface-elevated" aria-hidden="true" />
              )}
              {category.name}
            </Chip>
          );
        })}
      </div>

      {activeRoot && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={`${activeRoot.name} subcategories`}>
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{activeRoot.name}</span>
          <Chip active={selectedSlug === activeRoot.slug} onClick={() => onCategoryChange(activeRoot.slug)}>
            All {activeRoot.name}
          </Chip>
          {visibleSubcategories.map((category) => (
            <Chip key={category.id} active={selectedCategories.includes(category.slug)} onClick={() => onCategoryChange(category.slug)}>
              {category.name}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full border pl-1.5 pr-4 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground"}`}>
      {children}
    </button>
  );
}

function CategoryCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`group relative w-[132px] shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 xl:w-auto ${active ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(139,92,246,0.18)]" : "border-border/70 bg-background/30 hover:border-primary/35 hover:bg-surface-elevated"}`}>
      {children}
    </button>
  );
}
