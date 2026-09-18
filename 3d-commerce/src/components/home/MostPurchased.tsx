"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect, useState } from "react";

import {
  IconArrowUpRight,
  IconCheck,
  IconShoppingCart,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useCart } from "@/context/CartContext";

import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProducts, type CatalogProduct, type StorefrontProduct } from "@/lib/catalog-api";

export function MostPurchased() {
  const shouldReduceMotion = useReducedMotion();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(getBackendApiUrl("products"), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog");
        return (await response.json()) as CatalogProduct[];
      })
      .then((data) => {
        if (!cancelled) setProducts(mapCatalogProducts(data).filter((product) => product.badge || product.model).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => { cancelled = true; };
  }, []);

  const animationInitial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const animationWhileInView = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <section id="most-purchased" className="relative overflow-hidden py-12 sm:py-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute left-[15%] top-0 -z-10 h-[320px] w-[320px] rounded-full bg-primary/[0.035] blur-[120px] sm:h-[360px] sm:w-[360px]" />

      <Container>
        <motion.div initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mb-6 flex items-end justify-between gap-4 sm:mb-9">
          <div>
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.24em] text-primary sm:mb-2 sm:text-[10px]">Popular right now</p>
            <h2 className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-5xl">Most Purchased</h2>
          </div>

          <Button href="/shop" variant="ghost" size="sm" className="group hidden sm:inline-flex">
            Explore All Models
            <IconArrowUpRight size={16} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          {products.map((product, index) => (
            <motion.div key={product.id} initial={animationInitial} whileInView={animationWhileInView} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.55, delay: shouldReduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }} className="w-[190px] shrink-0 snap-start sm:w-auto">
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between sm:hidden">
          <span className="text-[9px] uppercase tracking-[0.16em] text-muted">Swipe to explore</span>
          <div className="flex items-center gap-1.5"><span className="h-1 w-6 rounded-full bg-primary" /><span className="h-1 w-1 rounded-full bg-muted/30" /><span className="h-1 w-1 rounded-full bg-muted/30" /></div>
        </div>

        <div className="mt-6 flex justify-center sm:hidden">
          <Button href="/shop" variant="outline" size="sm" className="group">
            Explore All Models
            <IconArrowUpRight size={15} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Container>
    </section>
  );
}

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product, "medium", 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Card interactive className="group h-full rounded-xl">
      <div className="relative overflow-hidden">
        <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="block">
          <div className="relative aspect-[1/0.82] overflow-hidden bg-surface-elevated/40 sm:aspect-[4/4.1]">
            <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.18),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>
        </Link>

        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
          <Badge variant="default" className="px-2 py-0.5 text-[8px]">{product.category}</Badge>
        </div>

        <WishlistButton
          product={product}
          className="absolute right-2.5 top-2.5 z-10 h-7 w-7 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
        />
      </div>

      <div className="flex flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${product.id}`} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-medium leading-4 tracking-[-0.01em] text-foreground transition-colors duration-300 hover:text-primary-hover sm:text-sm sm:leading-5">{product.name}</h3>
          </Link>
          <div className="shrink-0 pt-0.5 text-right"><Price value={product.price} size="sm" /></div>
        </div>

        <Rating value={product.rating} reviewCount={product.reviewCount} size={11} showValue className="mt-2" />

        <Button type="button" variant="primary" size="sm" ariaLabel={`Add ${product.name} to cart`} onClick={handleAddToCart} className="mt-3 !h-11 !min-h-11 w-full !rounded-xl !px-4 shadow-[0_0_18px_rgba(139,92,246,0.18)] sm:!h-12 sm:!min-h-12">
          {added ? <IconCheck size={15} stroke={2} /> : <IconShoppingCart size={15} stroke={1.8} />}
          <span>{added ? "Added to Cart" : "Add to Cart"}</span>
        </Button>
      </div>
    </Card>
  );
}
