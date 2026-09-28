"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconShoppingCart } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { StorefrontProduct } from "@/lib/catalog-api";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const [added, setAdded] = useState(false);

  const goToLogin = () => {
    router.push("/login?returnTo=" + encodeURIComponent("/product/" + product.slug));
  };

  const handleAddToCart = async () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    const variant = product.variants?.[0] ?? null;
    const success = await addItem(product, variant, 1);
    if (!success) return;

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
          <Link href={`/product/${product.slug}`} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-medium leading-4 tracking-[-0.01em] text-foreground transition-colors duration-300 hover:text-primary-hover sm:text-sm sm:leading-5">{product.name}</h3>
          </Link>
          <div className="shrink-0 pt-0.5 text-right"><Price value={product.price} size="sm" /></div>
        </div>

        <Rating value={product.rating} reviewCount={product.reviewCount} size={11} showValue className="mt-2" />

        <Button
          type="button"
          variant="primary"
          size="sm"
          ariaLabel={`Add ${product.name} to cart`}
          onClick={handleAddToCart}
          disabled={isLoading}
          className="mt-3 !h-11 !min-h-11 w-full !rounded-xl !px-4 shadow-[0_0_18px_rgba(139,92,246,0.18)] sm:!h-12 sm:!min-h-12"
        >
          {added ? <IconCheck size={15} stroke={2} /> : <IconShoppingCart size={15} stroke={1.8} />}
          <span>{added ? "Added to Cart" : "Add to Cart"}</span>
        </Button>
      </div>
    </Card>
  );
}
