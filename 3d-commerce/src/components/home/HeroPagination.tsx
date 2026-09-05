"use client";

import { motion } from "motion/react";

interface HeroPaginationProps {
  count: number;
  activeIndex: number;
  onChange: (index: number) => void;
}

export function HeroPagination({
  count,
  activeIndex,
  onChange,
}: HeroPaginationProps) {
  if (count <= 1) {
    return null;
  }

  return (
    <div
      className="
        absolute
        bottom-8
        left-0
        z-40
        flex
        items-center
        gap-2
        rounded-full
        border
        border-border/60
        bg-background/40
        px-3
        py-2
        backdrop-blur-md
        lg:left-1/2
        lg:-translate-x-1/2
      "
      aria-label="Featured products"
    >
      {Array.from({
        length: count,
      }).map((_, index) => {
        const active =
          index === activeIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() =>
              onChange(index)
            }
            aria-label={`Show product ${index + 1}`}
            aria-current={
              active
                ? "true"
                : undefined
            }
            className="
              flex
              h-4
              items-center
              justify-center
              rounded-full
              focus-visible:outline-none
            "
          >
            <motion.span
              initial={false}
              animate={{
                width: active ? 26 : 6,
                opacity: active
                  ? 1
                  : 0.3,
              }}
              transition={{
                duration: 0.25,
              }}
              className="
                h-1.5
                rounded-full
                bg-primary
              "
            />
          </button>
        );
      })}
    </div>
  );
}