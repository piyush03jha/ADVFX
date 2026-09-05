"use client";

import { IconLayoutGrid } from "@tabler/icons-react";

interface ShopNavigationProps {
  categories: string[];
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
    <div
      className="
        flex
        gap-2
        overflow-x-auto
        px-1
        pb-1
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
      "
    >
      <NavPill active={isAllActive} onClick={onShowAll}>
        <IconLayoutGrid size={13} stroke={1.8} />
        All Models
      </NavPill>

      {categories.map((category) => (
        <NavPill
          key={category}
          active={selectedCategories.includes(category)}
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </NavPill>
      ))}
    </div>
  );
}

function NavPill({
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
      className={`
        flex
        h-9
        shrink-0
        items-center
        gap-1.5
        whitespace-nowrap
        rounded-full
        border
        px-4
        text-[11px]
        font-medium
        uppercase
        tracking-[0.08em]
        transition-all
        duration-300
        ${
          active
            ? "border-primary/50 bg-primary/10 text-primary-hover shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
            : "border-border bg-surface/30 text-muted hover:border-primary/30 hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}