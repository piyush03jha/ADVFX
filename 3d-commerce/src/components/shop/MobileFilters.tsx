"use client";

import {
  IconCheck,
  IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

import type { ShopFilterState } from "./ShopFilters";

interface MobileFiltersProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  filters: ShopFilterState;
  onChange: (
    filters: ShopFilterState,
  ) => void;
  onClear: () => void;
}

export function MobileFilters({
  open,
  onClose,
  categories,
  filters,
  onChange,
  onClear,
}: MobileFiltersProps) {
  if (!open) {
    return null;
  }

  const toggleCategory = (
    category: string,
  ) => {
    const selected =
      filters.categories.includes(category);

    onChange({
      ...filters,
      categories: selected
        ? filters.categories.filter(
            (item) => item !== category,
          )
        : [
            ...filters.categories,
            category,
          ],
    });
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        lg:hidden
      "
    >
      {/* Backdrop */}

      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-black/70
          backdrop-blur-sm
        "
      />

      {/* Drawer */}

      <div
        className="
          absolute
          inset-x-0
          bottom-0
          max-h-[88svh]
          overflow-y-auto
          rounded-t-[28px]
          border-t
          border-border
          bg-[#0c0c0c]
          p-5
          pb-[calc(1.25rem+env(safe-area-inset-bottom))]
          shadow-[0_-20px_80px_rgba(0,0,0,0.55)]
        "
      >
        {/* Header */}

        <div
          className="
            mb-5
            flex
            items-center
            justify-between
          "
        >
          <div>
            <p
              className="
                text-[9px]
                uppercase
                tracking-[0.2em]
                text-primary
              "
            >
              Refine
            </p>

            <h2
              className="
                mt-1
                text-lg
                font-semibold
                text-foreground
              "
            >
              Filters
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-border
              text-muted
              transition-colors
              hover:border-primary/50
              hover:text-foreground
            "
          >
            <IconX size={17} />
          </button>
        </div>

        {/* Categories */}

        <div
          className="
            border-b
            border-border/70
            pb-5
          "
        >
          <h3
            className="
              mb-3
              text-[10px]
              font-medium
              uppercase
              tracking-[0.16em]
              text-foreground
            "
          >
            Category
          </h3>

          <div
            className="
              grid
              grid-cols-2
              gap-2
            "
          >
            {categories.map(
              (category) => {
                const selected =
                  filters.categories.includes(
                    category,
                  );

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      toggleCategory(
                        category,
                      )
                    }
                    className={`
                      flex
                      min-h-10
                      items-center
                      justify-between
                      rounded-xl
                      border
                      px-3
                      text-left
                      text-xs
                      transition-all
                      ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary-hover"
                          : "border-border bg-surface text-muted"
                      }
                    `}
                  >
                    <span>
                      {category}
                    </span>

                    {selected && (
                      <IconCheck
                        size={13}
                      />
                    )}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Price */}

        <div
          className="
            border-b
            border-border/70
            py-5
          "
        >
          <h3
            className="
              mb-3
              text-[10px]
              font-medium
              uppercase
              tracking-[0.16em]
              text-foreground
            "
          >
            Price
          </h3>

          <div
            className="
              grid
              grid-cols-2
              gap-2
            "
          >
            {[
              {
                label: "Under ₹2,000",
                min: 0,
                max: 2000,
              },
              {
                label: "₹2,000 – ₹4,000",
                min: 2000,
                max: 4000,
              },
              {
                label: "₹4,000 – ₹7,000",
                min: 4000,
                max: 7000,
              },
              {
                label: "₹7,000+",
                min: 7000,
                max: Infinity,
              },
            ].map((option) => {
              const selected =
                filters.minPrice ===
                  option.min &&
                filters.maxPrice ===
                  option.max;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      minPrice: option.min,
                      maxPrice: option.max,
                    })
                  }
                  className={`
                    min-h-10
                    rounded-xl
                    border
                    px-3
                    text-xs
                    transition-all
                    ${
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary-hover"
                        : "border-border bg-surface text-muted"
                    }
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating */}

        <div className="py-5">
          <h3
            className="
              mb-3
              text-[10px]
              font-medium
              uppercase
              tracking-[0.16em]
              text-foreground
            "
          >
            Minimum rating
          </h3>

          <div className="flex gap-2">
            {[4.5, 4, 3].map(
              (rating) => {
                const selected =
                  filters.minRating ===
                  rating;

                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...filters,
                        minRating: selected
                          ? 0
                          : rating,
                      })
                    }
                    className={`
                      rounded-full
                      border
                      px-4
                      py-2
                      text-xs
                      transition-all
                      ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary-hover"
                          : "border-border text-muted"
                      }
                    `}
                  >
                    {rating}+
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Actions */}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClear}
            className="flex-1"
          >
            Clear
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            Show Results
          </Button>
        </div>
      </div>
    </div>
  );
}