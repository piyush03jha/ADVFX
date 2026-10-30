"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/home/ProductCard";
import { mapCatalogProducts, type CatalogProduct, type StorefrontProduct } from "@/lib/catalog-api";
import Link from "next/link";

export function BestSellers({ initialProducts = [], catalogFact }: { initialProducts?: CatalogProduct[]; catalogFact?: string | null }) {
  const shouldReduceMotion = useReducedMotion();
  const [products, setProducts] = useState<StorefrontProduct[]>(() =>
    mapCatalogProducts(initialProducts.filter((product) => product.status === "ACTIVE" && product.isBestseller)).slice(0, 4),
  );

  useEffect(() => {
    if (initialProducts.length > 0) return;
    let cancelled = false;
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog");
        return (await response.json()) as CatalogProduct[];
      })
      .then((data) => {
        if (!cancelled) setProducts(mapCatalogProducts(data.filter((product) => product.status === "ACTIVE" && product.isBestseller)).slice(0, 4));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [initialProducts.length]);

  const initial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const visible = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <section id="best-sellers" className="relative scroll-mt-28 overflow-hidden py-8 sm:py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute left-[15%] top-0 -z-10 h-[320px] w-[320px] rounded-full bg-primary/[0.035] blur-[120px] sm:h-[360px] sm:w-[360px]" />
      <Container>
        <motion.div initial={initial} whileInView={visible} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mb-6 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.24em] text-primary sm:mb-2 sm:text-[10px]">Popular right now</p>
            <h2 className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">Best Sellers</h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted sm:mt-3 sm:text-sm sm:leading-6">Discover physical 3D printed anime figures, miniatures and collectibles, made for display and delivered across India.{catalogFact ? ` ${catalogFact}` : ""}</p>
          </div>
          <Button href="/shop" variant="ghost" size="sm" className="group hidden sm:inline-flex">
            See all best sellers
            <IconArrowUpRight size={16} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </motion.div>

        {products.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 desk:grid desk:grid-cols-4 desk:overflow-visible desk:pb-0">
            {products.map((product, index) => (
              <motion.div key={product.id} initial={initial} whileInView={visible} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.55, delay: shouldReduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }} className="w-[190px] shrink-0 snap-start sm:w-[260px] desk:w-auto">
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface/40 px-5 py-8 sm:px-8 sm:py-10">
            <p className="mx-auto max-w-2xl text-center text-sm leading-6 text-muted">
              Explore the Voxel3D collection of physical 3D printed models and collectibles. Browse the full shop to discover available figures, miniatures and display pieces.
            </p>
            <p className="mt-4 text-center text-sm font-medium">
              <Link href="/shop" className="text-primary underline-offset-4 hover:underline">Browse all 3D printed models</Link>
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center sm:hidden">
          <Button href="/shop" variant="outline" size="sm">Shop all 3D printed models</Button>
        </div>
      </Container>
    </section>
  );
}
