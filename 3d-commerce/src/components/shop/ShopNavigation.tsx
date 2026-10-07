"use client";

import { IconLayoutGrid } from "@tabler/icons-react";
import type { ShopCategory } from "@/lib/category-api";
import { resolveMediaUrl } from "@/lib/media-url";

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

  return (
    <section aria-label="Product categories">
      <div className="snap-rail -mx-3 flex gap-2 px-3 pb-1 sm:hidden">
        <Chip active={allActive} onClick={onShowAll}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconLayoutGrid size={16} stroke={1.8} />
          </span>
          All
        </Chip>
        {categories.map((category) => {
          const image = resolveMediaUrl(category.imageUrl);
          return (
            <Chip
              key={category.id}
              active={selectedCategories.includes(category.slug)}
              onClick={() => onCategoryChange(category.slug)}
            >
              {image ? (
                <img src={image} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-surface-elevated" />
              )}
              {category.name}
            </Chip>
          );
        })}
      </div>

      <div className="relative hidden overflow-hidden rounded-[28px] border border-border bg-surface/40 p-3 sm:block">
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-8 xl:overflow-visible">
          <CategoryCard active={allActive} onClick={onShowAll}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-background">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,0.22),transparent_46%),radial-gradient(circle_at_80%_85%,rgba(139,92,246,0.14),transparent_48%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-elevated text-primary">
                  <span className="text-lg font-semibold">+</span>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-sm font-medium text-foreground">All Models</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">Full collection</p>
              </div>
            </div>
          </CategoryCard>

          {categories.map((category) => {
            const image = resolveMediaUrl(category.imageUrl);
            return (
              <CategoryCard
                key={category.id}
                active={selectedCategories.includes(category.slug)}
                onClick={() => onCategoryChange(category.slug)}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-background">
                  {image ? (
                    <img src={image} alt={category.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.25),transparent_55%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                    <p className="text-sm font-medium text-white">{category.name}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/70">{category.description || "Explore this collection."}</p>
                  </div>
                </div>
              </CategoryCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full border pl-1.5 pr-4 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function CategoryCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative w-[132px] shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 xl:w-auto ${
        active
          ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(139,92,246,0.18)]"
          : "border-border/70 bg-background/30 hover:border-primary/35 hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}
