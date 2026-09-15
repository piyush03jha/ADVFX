"use client";

import type { ShopCategory } from "@/config/shop-categories";

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
  const isAllActive = selectedCategories.length === 0;

  return (
    <section aria-label="Product categories" className="relative overflow-hidden rounded-[28px] border border-border bg-surface/40 p-2 sm:p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <CategoryCard active={isAllActive} onClick={onShowAll}>
          <div className="relative min-h-36 overflow-hidden rounded-2xl bg-background">
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

        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            active={selectedCategories.includes(category.id)}
            onClick={() => onCategoryChange(category.id)}
          >
            <div className="relative min-h-36 overflow-hidden rounded-2xl bg-background">
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                <p className="text-sm font-medium text-white">{category.name}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/70">{category.description}</p>
              </div>
            </div>
          </CategoryCard>
        ))}
      </div>
    </section>
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
      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        active
          ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(139,92,246,0.18)]"
          : "border-border/70 bg-background/30 hover:border-primary/35 hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}
