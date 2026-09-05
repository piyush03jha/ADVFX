"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import {
  IconArrowUpRight,
  IconCheck,
  IconHeart,
  IconShoppingCart,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { IconButton } from "@/components/ui/IconButton";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { useCart } from "@/context/CartContext";
import { useWishlist, type WishlistProduct } from "@/context/WishlistContext";

import { mostPurchasedProducts } from "@/config/most-purchased-products";

export function MostPurchased() {
  const shouldReduceMotion = useReducedMotion();
  const products = mostPurchasedProducts.slice(0, 4);

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

          <Button href="/models" variant="ghost" size="sm" className="group hidden sm:inline-flex">
            View All
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
          <Button href="/models" variant="outline" size="sm" className="group">
            View All
            <IconArrowUpRight size={15} stroke={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </Container>
    </section>
  );
}

function ProductCard({ product }: { product: (typeof mostPurchasedProducts)[number] }) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const liked = isInWishlist(product.id);
  const wishlistProduct: WishlistProduct = product;

  const handleAddToCart = () => {
    addItem(product, "medium", 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Card interactive className="group h-full rounded-xl">
      <Link href={`/product/${product.id}`} aria-label={`View ${product.name}`} className="block">
        <div className="relative aspect-[1/0.82] overflow-hidden bg-surface-elevated/40 sm:aspect-[4/4.1]">
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.18),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3"><Badge variant="default" className="px-2 py-0.5 text-[8px]">{product.category}</Badge></div>
        </div>
      </Link>

      <div className="flex flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${product.id}`} className="min-w-0">
            <h3 className="line-clamp-2 text-xs font-medium leading-4 tracking-[-0.01em] text-foreground transition-colors duration-300 hover:text-primary-hover sm:text-sm sm:leading-5">{product.name}</h3>
          </Link>

          <IconButton label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} size="sm" variant="default" onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleWishlist(wishlistProduct); }} className={`h-7 w-7 shrink-0 sm:h-8 sm:w-8 ${liked ? "border-primary/50 bg-primary/10 text-primary" : ""}`}>
            <IconHeart size={13} stroke={1.7} fill={liked ? "currentColor" : "none"} />
          </IconButton>
        </div>

        <Rating value={product.rating} reviewCount={product.reviewCount} size={11} showValue className="mt-2" />

        <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
          <Price value={product.price} size="sm" />
          <Button type="button" variant="primary" size="sm" ariaLabel={`Add ${product.name} to cart`} onClick={handleAddToCart} className="!h-8 !min-h-8 !w-8 !rounded-full !p-0 shadow-[0_0_18px_rgba(139,92,246,0.18)] sm:!w-auto sm:!px-3">
            {added ? <IconCheck size={13} stroke={2} /> : <IconShoppingCart size={13} stroke={1.8} />}
            <span className="hidden sm:inline">{added ? "Added" : "Add"}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
