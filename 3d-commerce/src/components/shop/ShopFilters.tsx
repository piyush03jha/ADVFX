"use client";

import { useState, type ReactNode } from "react";
import { IconCheck, IconChevronDown, IconFilter, IconX } from "@tabler/icons-react";

export interface ShopFilterState {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number;
}

interface ShopFiltersProps {
  categories: string[];
  filters: ShopFilterState;
  onChange: (filters: ShopFilterState) => void;
  onClear: () => void;
}

const PRICE_OPTIONS = [
  { label: "Under ₹2,000", min: 0, max: 2000 },
  { label: "₹2,000 – ₹4,000", min: 2000, max: 4000 },
  { label: "₹4,000 – ₹7,000", min: 4000, max: 7000 },
  { label: "₹7,000+", min: 7000, max: Infinity },
];

const RATING_OPTIONS = [
  { label: "4.5+", value: 4.5 },
  { label: "4.0+", value: 4 },
  { label: "3.0+", value: 3 },
];

export function ShopFilters({ categories, filters, onChange, onClear }: ShopFiltersProps) {
  const [open, setOpen] = useState<string | null>(null);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minPrice !== 0 ||
    filters.maxPrice !== Infinity ||
    filters.minRating !== 0;

  const toggleCategory = (category: string) => {
    const selected = filters.categories.includes(category);
    onChange({
      ...filters,
      categories: selected
        ? filters.categories.filter((item) => item !== category)
        : [...filters.categories, category],
    });
  };

  return (
    <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-6">
      <div className="flex items-center gap-2">
        <FilterDropdown
          label="Category"
          open={open === "category"}
          onToggle={() => setOpen(open === "category" ? null : "category")}
        >
          <div className="w-60 p-2">
            {categories.map((category) => {
              const selected = filters.categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
                >
                  <span>{category}</span>
                  {selected && <IconCheck size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        <FilterDropdown
          label="Price"
          open={open === "price"}
          onToggle={() => setOpen(open === "price" ? null : "price")}
        >
          <div className="w-56 p-2">
            {PRICE_OPTIONS.map((option) => {
              const selected = filters.minPrice === option.min && filters.maxPrice === option.max;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, minPrice: option.min, maxPrice: option.max });
                    setOpen(null);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
                >
                  <span>{option.label}</span>
                  {selected && <IconCheck size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        <FilterDropdown
          label="Rating"
          open={open === "rating"}
          onToggle={() => setOpen(open === "rating" ? null : "rating")}
        >
          <div className="w-44 p-2">
            {RATING_OPTIONS.map((option) => {
              const selected = filters.minRating === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, minRating: selected ? 0 : option.value });
                    setOpen(null);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
                >
                  <span>{option.label}</span>
                  {selected && <IconCheck size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </FilterDropdown>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(null);
            }}
            className="flex h-9 items-center gap-2 rounded-full px-3 text-[10px] font-medium tracking-[0.08em] text-primary transition-colors hover:bg-primary/10"
          >
            <IconX size={13} />
            Clear Filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted">
        <IconFilter size={12} />
        Refine collection
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
          open
            ? "border-primary/50 bg-primary/[0.06] text-foreground"
            : "border-border bg-surface/30 text-muted hover:border-primary/30 hover:text-foreground"
        }`}
      >
        {label}
        <IconChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-background/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {children}
        </div>
      )}
    </div>
  );
}