"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { Section } from "@/components/ui/Section";
import { ProductListThumbnail } from "./ProductListThumbnail";

import { newArrivals } from "@/config/new-arrivals";

export function NewArrivals() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Section glow className="py-12 sm:py-20 lg:py-28">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-9">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-primary sm:text-[10px]">Fresh In</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-4xl">New Arrivals</h2>
        </div>
        <Button href="/shop?sort=newest" variant="ghost" size="sm" className="group">
          View all new arrivals
          <IconArrowUpRight size={15} stroke={1.7} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {newArrivals.map((product, index) => (
          <motion.div
            key={product.id}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href={`/product/${product.id}`} className="group block h-full">
              <Card interactive className="h-full overflow-hidden rounded-xl">
                <div className="relative overflow-hidden bg-surface-elevated">
                  <ProductListThumbnail model={product.model} />
                  <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
                    <Badge variant="success" className="text-[8px] sm:text-[9px]">New</Badge>
                  </div>
                  <div className="absolute right-2.5 top-2.5 rounded-full border border-white/15 bg-black/65 p-1.5 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
                    <IconArrowUpRight size={13} stroke={1.8} />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col p-3 sm:p-4">
                  <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-muted sm:text-[10px]">{product.category}</p>
                  <h3 className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-foreground transition-colors group-hover:text-primary-hover sm:text-sm sm:leading-5">{product.name}</h3>
                  {product.rating !== undefined && product.reviewCount !== undefined && (
                    <Rating value={product.rating} reviewCount={product.reviewCount} size={10} className="mt-2" />
                  )}
                  <Price value={product.price} size="sm" className="mt-2" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
