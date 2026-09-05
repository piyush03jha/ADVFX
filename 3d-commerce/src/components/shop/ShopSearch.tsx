"use client";

import { IconSearch, IconX } from "@tabler/icons-react";

interface ShopSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ShopSearch({ value, onChange }: ShopSearchProps) {
  return (
    <div className="relative w-full sm:max-w-[330px] lg:max-w-[360px]">
      <IconSearch size={17} stroke={1.6} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search models..."
        aria-label="Search models"
        className="h-11 w-full rounded-full border border-border bg-surface/30 pl-11 pr-11 text-sm text-foreground outline-none placeholder:text-muted/60 transition-colors focus:border-primary/40 focus:bg-surface/60"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-elevated hover:text-foreground"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}