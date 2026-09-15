"use client";

import { IconSearch, IconX } from "@tabler/icons-react";

interface ShopSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ShopSearch({ value, onChange }: ShopSearchProps) {
  return (
    <div className="relative w-full xl:flex-1">
      <div className="flex min-h-14 items-center rounded-2xl border border-border bg-surface px-4 shadow-[0_14px_45px_rgba(0,0,0,0.08)]">
        <IconSearch size={20} stroke={1.7} className="shrink-0 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search models, characters, toys, gaming..."
          aria-label="Search products"
          className="h-12 w-full appearance-none bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <IconX size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
