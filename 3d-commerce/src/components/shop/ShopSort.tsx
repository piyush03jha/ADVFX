"use client";

import {
  IconArrowsSort,
} from "@tabler/icons-react";

export type ShopSortValue =
  | "featured"
  | "newest"
  | "price-low"
  | "price-high"
  | "rating"
  | "popular";

interface ShopSortProps {
  value: ShopSortValue;
  onChange: (
    value: ShopSortValue,
  ) => void;
}

const options: {
  value: ShopSortValue;
  label: string;
}[] = [
  {
    value: "featured",
    label: "Featured",
  },
  {
    value: "newest",
    label: "Newest",
  },
  {
    value: "popular",
    label: "Most Popular",
  },
  {
    value: "rating",
    label: "Top Rated",
  },
  {
    value: "price-low",
    label: "Price: Low to High",
  },
  {
    value: "price-high",
    label: "Price: High to Low",
  },
];

export function ShopSort({
  value,
  onChange,
}: ShopSortProps) {
  return (
    <div className="relative">
      <IconArrowsSort
        size={14}
        stroke={1.7}
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          z-10
          -translate-y-1/2
          text-muted
        "
      />

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value as ShopSortValue,
          )
        }
        className="
          h-10
          appearance-none
          rounded-full
          border
          border-border
          bg-surface
          pl-9
          pr-8
          text-xs
          text-foreground
          outline-none
          transition-colors
          focus:border-primary/60
        "
        aria-label="Sort products"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-surface text-foreground"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}