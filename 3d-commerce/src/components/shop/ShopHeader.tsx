"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

interface ShopHeaderProps {
  productCount: number;
  onOpenFilters?: () => void;
}

export function ShopHeader({ productCount, onOpenFilters }: ShopHeaderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-0 -z-10 h-[240px] w-[420px] rounded-full bg-primary/[0.04] blur-[120px]"
      />

      <Container className="pb-3 pt-24 sm:pb-4 sm:pt-26 lg:pb-5 lg:pt-28">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-end justify-between gap-8">
            <div className="min-w-0">
              <h1 className="font-serif text-4xl font-normal tracking-[-0.055em] text-foreground sm:text-5xl lg:text-6xl">
                Explore Models
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-[15px]">
                Premium 3D assets, digital collectibles, gaming models, and custom-ready pieces.
              </p>
            </div>

            <div className="hidden shrink-0 items-end text-right lg:flex">
              <div>
                <p className="font-serif text-4xl leading-none tracking-[-0.05em] text-primary">
                  {productCount}
                </p>
                <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-muted">
                  Models
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between lg:hidden">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
              {productCount} models
            </span>

            {onOpenFilters && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenFilters}>
                <IconAdjustmentsHorizontal size={15} />
                Filters
              </Button>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
