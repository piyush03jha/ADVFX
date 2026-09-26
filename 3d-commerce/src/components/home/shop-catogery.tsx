"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Section } from "@/components/ui/Section";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

export function ShopByCategory() {
  const shouldReduceMotion = useReducedMotion();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setCategories(
            (Array.isArray(data) ? data : []).filter(
              (category: Category) => category.isActive,
            ),
          );
        }
      } catch {
        // Keep the section empty rather than showing stale hard-coded categories.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section glow className="overflow-hidden py-12 sm:py-20 lg:py-28">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-9 sm:gap-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-primary sm:text-[10px]">
            Explore the collection
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.045em] text-foreground sm:mt-3 sm:text-4xl lg:text-5xl">
            Shop by Category
          </h2>
        </motion.div>

        <Button href="/shop" variant="ghost" size="sm" className="hidden sm:inline-flex">
          View All
          <IconArrowUpRight size={16} stroke={1.7} />
        </Button>
      </div>

      {categories.length > 0 && (
        <>
          <div className="-mx-5 flex gap-3 overflow-x-auto overscroll-x-contain px-5 pb-3 snap-x snap-mandatory sm:-mx-8 sm:px-8 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.25),
                }}
                className="w-[68vw] shrink-0 snap-start min-[400px]:w-[58vw] sm:w-[42vw]"
              >
                <CategoryCard category={category} index={index} />
              </motion.div>
            ))}
          </div>

          <div className="hidden grid-cols-6 gap-3 lg:grid">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.55,
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.045, 0.3),
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <CategoryCard category={category} index={index} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

function CategoryCard({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.name)}`}
      className="group block"
    >
      <Card
        interactive
        className="relative aspect-[1/1.28] rounded-2xl sm:aspect-[1/1.38] lg:aspect-[1/1.32]"
      >
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            loading={index < 4 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.25),transparent_55%)]" />
        )}

        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.22),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
          <IconButton
            label={`Open ${category.name}`}
            size="sm"
            variant="default"
            tabIndex={-1}
            className="h-8 w-8 !border-white/20 !bg-black/80 !text-white backdrop-blur-md sm:h-9 sm:w-9"
          >
            <IconArrowUpRight size={14} stroke={1.7} />
          </IconButton>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-5">
          <Badge
            variant="default"
            className="!border-stone-200 !bg-[#f5f3ef] !px-2 !py-0.5 !text-[8px] !text-stone-900 shadow-md backdrop-blur-md dark:!border-white/20 dark:!bg-black/90 dark:!text-white sm:!px-2.5 sm:!py-1 sm:!text-[10px]"
          >
            {category._count?.products ?? 0} models
          </Badge>

          <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-tight tracking-[-0.025em] text-white sm:mt-3 sm:text-lg lg:text-xl">
            {category.name}
          </h3>
        </div>
      </Card>
    </Link>
  );
}
