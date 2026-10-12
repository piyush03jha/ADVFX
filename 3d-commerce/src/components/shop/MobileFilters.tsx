"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import type { ShopCategory } from "@/lib/category-api";
import type { ShopFilterState } from "./ShopFilters";

interface MobileFiltersProps {
  open: boolean;
  onClose: () => void;
  categories: ShopCategory[];
  filters: ShopFilterState;
  onChange: (filters: ShopFilterState) => void;
}

const PRICE_OPTIONS = [
  { label: "Under ₹2,000", min: 0, max: 2000 },
  { label: "₹2,000 – ₹4,000", min: 2000, max: 4000 },
  { label: "₹4,000 – ₹7,000", min: 4000, max: 7000 },
  { label: "₹7,000+", min: 7000, max: Infinity },
];

const EMPTY: ShopFilterState = {
  categories: [],
  minPrice: 0,
  maxPrice: Infinity,
  minRating: 0,
};

export function MobileFilters(props: MobileFiltersProps) {
  if (!props.open) return null;
  return <FiltersSheet {...props} />;
}

function FiltersSheet({ onClose, categories, filters, onChange }: MobileFiltersProps) {
  const [draft, setDraft] = useState<ShopFilterState>(filters);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const toggleCategory = (slug: string) =>
    setDraft((current) => ({
      ...current,
      categories: current.categories.includes(slug)
        ? current.categories.filter((item) => item !== slug)
        : [...current.categories, slug],
    }));

  const apply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[28px] border-t border-border bg-surface text-foreground shadow-[0_-20px_80px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Refine</p>
            <h2 className="mt-0.5 text-lg font-semibold">Filters</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close filters" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary/50 hover:text-foreground">
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <Group title="Category">
            {categories.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => {
                  const selected = draft.categories.includes(category.slug);
                  return (
                    <Option key={category.id} selected={selected} onClick={() => toggleCategory(category.slug)}>
                      <span className="truncate">{category.name}</span>
                      {selected && <IconCheck size={14} />}
                    </Option>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted">No categories available.</p>
            )}
          </Group>

          <Group title="Price">
            <div className="grid grid-cols-2 gap-2">
              {PRICE_OPTIONS.map((option) => {
                const selected = draft.minPrice === option.min && draft.maxPrice === option.max;
                return (
                  <Option
                    key={option.label}
                    selected={selected}
                    onClick={() => setDraft((current) => selected ? { ...current, minPrice: 0, maxPrice: Infinity } : { ...current, minPrice: option.min, maxPrice: option.max })}
                  >
                    {option.label}
                  </Option>
                );
              })}
            </div>
          </Group>

          <Group title="Minimum rating" last>
            <div className="flex gap-2">
              {[4.5, 4, 3].map((rating) => {
                const selected = draft.minRating === rating;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, minRating: selected ? 0 : rating }))}
                    className={`min-h-11 rounded-full border px-5 text-sm transition-all ${
                      selected ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted"
                    }`}
                  >
                    {rating}+
                  </button>
                );
              })}
            </div>
          </Group>
        </div>

        <div className="flex gap-2 border-t border-border px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <Button type="button" variant="ghost" size="md" onClick={() => setDraft(EMPTY)} className="flex-1">Reset</Button>
          <Button type="button" variant="primary" size="md" onClick={apply} className="flex-[2]">Show results</Button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, last, children }: { title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`py-4 ${last ? "" : "border-b border-border/70"}`}>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm transition-all ${
        selected ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-muted"
      }`}
    >
      {children}
    </button>
  );
}
