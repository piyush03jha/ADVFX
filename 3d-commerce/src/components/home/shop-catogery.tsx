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
import { resolveMediaUrl } from "@/lib/media-url";

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
    <Section
      id="categories"
      glow
      className="!hidden max-[639px]:!hidden scroll-mt-28 overflow-hidden py-8 sm:!block sm:py-20 lg:py-28"
    >
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
        <div className="-mx-5 flex w-max min-w-full flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-5 pb-3 snap-x snap-mandatory sm:-mx-8 sm:px-8 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className="w-[148px] min-w-[148px] shrink-0 snap-start min-[400px]:w-[158px] min-[400px]:min-w-[158px] sm:w-[190px] sm:min-w-[190px] lg:w-[260px] lg:min-w-[260px] xl:w-[280px] xl:min-w-[280px]"
            >
              <CategoryCard category={category} index={index} />
            </motion.div>
          ))}
        </div>
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
  const imageUrl = resolveMediaUrl(category.imageUrl);
  const isAllModels =
    index === 0 && category.name.trim().toLowerCase().replace(/\\s+/g, " ") === "all models";

  return (
    <Link
      href={isAllModels ? "/shop" : `/shop?category=${encodeURIComponent(category.slug)}`}
      className="group block"
    >
      <Card
        interactive
        className="relative h-[190px] overflow-hidden rounded-2xl sm:h-[220px] lg:aspect-[1/1.32] lg:h-auto"
      >
        {isAllModels ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface px-3 text-center lg:hidden">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/8 text-primary">
              <IconArrowUpRight size={18} stroke={1.8} />
            </span>
            <h3 className="text-[14px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              All Models
            </h3>
            <span className="mt-1 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Full Collection
            </span>
          </div>
        ) : (
          <>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={category.name}
                loading={index < 4 ? "eager" : "lazy"}
                className="absolute inset-x-0 top-0 h-[112px] w-full object-contain object-center px-2 py-1 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 sm:h-[132px] sm:px-3 lg:h-full lg:px-0 lg:py-0 lg:object-cover"
              />
            ) : (
              <div className="absolute inset-x-0 top-0 h-[112px] bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.25),transparent_55%)] sm:h-[132px] lg:h-full" />
            )}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[112px] bg-gradient-to-t from-black/20 to-transparent sm:h-[132px] lg:hidden"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-gradient-to-t from-black via-black/35 to-black/5 lg:block"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.22),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:block"
            />

            <div className="absolute inset-x-0 bottom-0 flex h-[78px] flex-col justify-center bg-surface px-3 py-2.5 sm:h-[88px] sm:px-3.5 lg:absolute lg:h-auto lg:bg-transparent lg:p-5">
              <Badge
                variant="default"
                className="hidden w-fit !border-stone-200 !bg-[#f5f3ef] !px-1.5 !py-0.5 !text-[8px] !text-stone-900 shadow-sm dark:!border-white/20 dark:!bg-black/90 dark:!text-white lg:inline-flex lg:!px-2.5 lg:!py-1 lg:!text-[10px]"
              >
                {category._count?.products ?? 0} models
              </Badge>

              <h3 className="mt-1.5 line-clamp-1 text-[13px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:mt-2 sm:text-sm lg:mt-3 lg:line-clamp-2 lg:text-xl lg:text-white">
                {category.name}
              </h3>
            </div>
          </>
        )}

        {isAllModels && (
          <div className="pointer-events-none absolute right-2 top-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary">
              <IconArrowUpRight size={14} stroke={1.7} />
            </span>
          </div>
        )}

        <div className={`absolute right-2 top-2 ${isAllModels ? "hidden" : ""} sm:right-2.5 sm:top-2.5 lg:right-3 lg:top-3`}>
          <IconButton
            label={`Open ${category.name}`}
            size="sm"
            variant="default"
            tabIndex={-1}
            className="h-7 w-7 !border-white/20 !bg-black/70 !text-white backdrop-blur-md sm:h-8 sm:w-8 lg:h-9 lg:w-9"
          >
            <IconArrowUpRight size={14} stroke={1.7} />
          </IconButton>
        </div>

        {isAllModels && (
          <div className="absolute inset-0 hidden lg:flex lg:flex-col lg:items-start lg:justify-end lg:bg-gradient-to-t lg:from-black lg:via-black/35 lg:to-transparent lg:p-5">
            <Badge
              variant="default"
              className="!border-stone-200 !bg-[#f5f3ef] !px-2.5 !py-1 !text-[10px] !text-stone-900"
            >
              {category._count?.products ?? 0} models
            </Badge>
            <h3 className="mt-3 text-xl font-semibold text-white">
              {category.name}
            </h3>
          </div>
        )}
      </Card>
    </Link>
  );
}
