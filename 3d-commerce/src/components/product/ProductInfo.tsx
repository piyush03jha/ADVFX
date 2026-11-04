"use client";

import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";

import type { StorefrontProduct } from "@/lib/catalog-api";

import { ProductActions } from "./ProductActions";

import { useMemo, useState } from "react";

interface ProductInfoProps {
  product: StorefrontProduct;
}

export function ProductInfo({
  product,
}: ProductInfoProps) {
  const variants = product.variants ?? [];
  const lowestPricedVariant = useMemo(
    () =>
      variants
        .filter((variant) => variant.price !== undefined)
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] ??
      variants[0] ??
      null,
    [variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    lowestPricedVariant?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = useMemo(() => variants.find((variant) => variant.id === selectedVariantId) ?? null, [variants, selectedVariantId]);
  const selectedPrice = selectedVariant?.price ?? product.price;
  const selectedOldPrice = selectedVariant?.oldPrice ?? product.oldPrice;
  return (
    <div
      className="
        rounded-[22px]
        border
        border-border
        bg-surface
        p-4
        shadow-[0_20px_80px_rgba(0,0,0,0.22)]
        sm:p-7
        lg:p-5 desk:p-8
      "
    >
      {/* ==================================================
          CATEGORY
      ================================================== */}

      <div className="flex flex-wrap items-center gap-2">
        {product.badge && (
          <Badge variant="primary">
            {product.badge}
          </Badge>
        )}

        <Badge>
          {product.category}
        </Badge>
      </div>

      {/* ==================================================
          TITLE
      ================================================== */}

      <h1
        className="
          mt-3
          max-w-xl
          font-serif
          text-[2rem]
          leading-[0.96]
          tracking-[-0.045em]
          text-foreground
          sm:mt-5
          sm:text-5xl
          lg:text-[2.35rem] wide:text-[3.4rem]
        "
      >
        {product.name}
      </h1>

      {/* ==================================================
          RATING
      ================================================== */}

      <div
        className="
          mt-3
          flex
          flex-wrap
          items-center
          gap-3
        "
      >
        <Rating
          value={product.rating}
          reviewCount={product.reviewCount}
          size={13}
        />

        <span
          className="
            h-1
            w-1
            rounded-full
            bg-muted/40
          "
        />

        <span
          className="
            text-xs
            text-muted
          "
        >
          {product.reviewCount > 0 ? "Customer reviews" : "No reviews yet"}
        </span>
      </div>

      {/* ==================================================
          PRICE
      ================================================== */}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            ₹{selectedPrice.toLocaleString("en-IN")}
          </div>

          {selectedOldPrice !== undefined && selectedOldPrice > selectedPrice ? (
            <span className="text-sm text-muted line-through">
              ₹{selectedOldPrice.toLocaleString("en-IN")}
            </span>
          ) : null}

          {product.discount && (
            <Badge variant="primary" className="rounded-md px-2 py-1 font-semibold">
              {product.discount}
            </Badge>
          )}
        </div>

        <WishlistButton
          product={product}
          className="h-10 w-10 sm:h-11 sm:w-11"
        />
      </div>

      <p className="mt-1 text-[10px] text-muted">{product.gstRateBps != null ? `Inclusive of ${(product.gstRateBps / 100).toFixed(2)}% category GST` : "Inclusive of applicable category GST"}</p>

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(() => {
          const inventory = selectedVariant ?? product;
          const available = Math.max(0, (inventory.stock ?? product.stock) - (inventory.reserved ?? product.reserved));
          const tracksStock = inventory.trackStock ?? product.trackStock;
          const backorder = inventory.allowBackorder ?? product.allowBackorder;
          const lowStockAt = inventory.lowStockAt ?? product.lowStockAt;

          if (!tracksStock) return <Badge>Made to order</Badge>;
          if (available <= 0 && !backorder) {
            return (
              <Badge className="border-red-700/30 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
                Out of stock
              </Badge>
            );
          }
          if (available <= 0 && backorder) return <Badge>Available to order</Badge>;
          if (available <= lowStockAt) {
            return (
              <Badge className="border-orange-800/25 bg-orange-50 text-orange-950 dark:border-orange-300/25 dark:bg-orange-300/10 dark:text-orange-100">
                Only {available} left
              </Badge>
            );
          }
          return <Badge variant="success">{available} in stock</Badge>;
        })()}
      </div>

      <p
        className="
          mt-3
          max-w-xl
          text-xs
          leading-5
          text-muted
        "
      >
        {product.description}
      </p>

      {/* ==================================================
          PURCHASE ACTIONS
      ================================================== */}

      {selectedVariant && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/50 p-3" aria-live="polite">
          <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Selected size</p><p className="mt-1 text-xs font-medium">{selectedVariant.size || selectedVariant.name}</p></div>
          <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Estimated model weight</p><p className="mt-1 text-xs font-medium">{selectedVariant.weightGrams != null ? `${selectedVariant.weightGrams.toLocaleString("en-IN", { maximumFractionDigits: 2 })} g` : "Weight to be confirmed"}</p></div>
        </div>
      )}

      <ProductActions product={product} selectedVariantId={selectedVariantId} quantity={quantity} onVariantChange={setSelectedVariantId} onQuantityChange={setQuantity} />
    </div>
  );
}
