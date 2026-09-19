"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useCart } from "@/context/CartContext";

import type { StorefrontProduct } from "@/lib/catalog-api";

interface ShopProductCardProps {
  product: StorefrontProduct;
}

export function ShopProductCard({ product }: ShopProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [cartError, setCartError] = useState(false);

  const handleAddToCart = async () => {
    if (added || buying) return;
    setCartError(false);

    const variant = product.variants?.[0] ?? null;
    const success = await addItem(product, variant, 1);
    if (!success) {
      setCartError(true);
      return;
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = async () => {
    if (buying || added) return;
    setBuying(true);
    setCartError(false);

    window.localStorage.setItem(
      "forma-buy-now",
      JSON.stringify({
        key: product.id + ":base",
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          currency: product.currency,
          image: product.image,
          oldPrice: product.oldPrice,
          rating: product.rating,
          reviewCount: product.reviewCount,
          badge: product.badge,
          discount: product.discount,
          model: product.model,
        },
        variantId: null,
        variantName: null,
        variantSize: null,
        size: "Standard",
        quantity: 1,
      }),
    );

    router.push("/checkout?mode=buy-now");
  };

  return (
    <Card interactive className="group h-full rounded-2xl">
      <div className="relative aspect-[0.88/1] overflow-hidden bg-[#0c0c0c]">
        <Link href={`/product/${product.slug}`} className="block h-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </Link>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.20),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        {product.badge && (
          <div className="absolute left-3 top-3">
            <Badge variant="mediaPrimary">{product.badge}</Badge>
          </div>
        )}

        <WishlistButton
          product={product}
          className="absolute right-3 top-3 z-10"
        />

        {product.discount && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="media">{product.discount}</Badge>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            {product.category}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Price value={product.price} size="sm" />

            {product.oldPrice !== undefined && (
              <span className="text-[10px] text-muted line-through">
                ₹{product.oldPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="mt-1.5 min-h-[2.5rem] text-sm font-medium leading-5 tracking-[-0.015em] text-foreground transition-colors hover:text-primary-hover">
            {product.name}
          </h3>
        </Link>

        <Rating
          value={product.rating}
          reviewCount={product.reviewCount}
          size={12}
          className="mt-2.5"
        />

        {cartError ? (
          <p role="alert" className="mt-3 text-xs text-red-400">
            Unable to update your cart. Please try again.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="min-h-12 w-full text-xs font-semibold sm:text-sm"
          >
            {added ? "Added" : "Add to Cart"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleBuyNow}
            disabled={buying}
            className="min-h-12 w-full text-xs font-semibold sm:text-sm"
          >
            {buying ? "Opening…" : "Buy Now"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
