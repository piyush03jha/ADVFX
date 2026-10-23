"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

import { useEffect, useState } from "react";
import { mapCatalogProducts, type CatalogProduct, type StorefrontProduct } from "@/lib/catalog-api";
import { ProductCard } from "./ProductCard";

export function NewArrivals() {
  const shouldReduceMotion = useReducedMotion();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog");
        return (await response.json()) as CatalogProduct[];
      })
      .then((data) => {
        if (!cancelled) setProducts(
          mapCatalogProducts(data)
            .sort((a, b) => {
              const left = a.createdAt ? Date.parse(a.createdAt) : 0;
              const right = b.createdAt ? Date.parse(b.createdAt) : 0;
              return right - left;
            })
            .slice(0, 4),
        );
      })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, []);
  const animationInitial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const animationWhileInView = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <Section id="new-arrivals" glow className="scroll-mt-28 py-8 sm:py-20 lg:py-28">
      <Container>
        <motion.div initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mb-6 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.24em] text-primary sm:mb-2 sm:text-[10px]">Fresh In</p>
            <h2 className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">New Arrivals</h2>
          </div>

          <Button href="/shop" variant="ghost" size="sm" className="group hidden sm:inline-flex">
            Explore All Models
            <IconArrowUpRight size={16} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </motion.div>

        {products.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 desk:grid desk:grid-cols-4 desk:overflow-visible desk:pb-0">
            {products.map((product, index) => (
              <motion.div key={product.id} initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.55, delay: shouldReduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }} className="w-[190px] shrink-0 snap-start sm:w-[260px] desk:w-auto">
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface/40 px-5 py-8 text-center">
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted">
              New physical models and collectibles are added to the Voxel3D shop as they become available. Browse the complete collection to see currently published products.
            </p>
            <Button href="/shop" variant="outline" size="sm" className="mt-4">Browse the collection</Button>
          </div>
        )}

        <div className="mt-6 flex justify-center sm:hidden">
          <Button href="/shop" variant="outline" size="sm" className="group">
            Explore All Models
            <IconArrowUpRight size={15} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
