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
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = useMemo(() => variants.find((variant) => variant.id === selectedVariantId) ?? null, [variants, selectedVariantId]);
  const selectedPrice = selectedVariant?.price ?? product.price;
  const selectedOldPrice = selectedVariant?.oldPrice ?? product.oldPrice;
  return (
    <div
      className="
        rounded-[28px]
        border
        border-border
        bg-surface
        p-5
        shadow-[0_20px_80px_rgba(0,0,0,0.22)]
        sm:p-7
        lg:p-8
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
          mt-5
          max-w-xl
          font-serif
          text-4xl
          leading-[0.96]
          tracking-[-0.045em]
          text-foreground
          sm:text-5xl
          lg:text-[3.4rem]
        "
      >
        {product.name}
      </h1>

      {/* ==================================================
          RATING
      ================================================== */}

      <div
        className="
          mt-5
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

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
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

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {product.trackStock ? (
          product.stock > product.reserved ? (
            <Badge variant="primary">
              {product.stock - product.reserved} in stock
            </Badge>
          ) : product.allowBackorder ? (
            <Badge>Available to order</Badge>
          ) : (
            <Badge>Out of stock</Badge>
          )
        ) : (
          <Badge>Made to order</Badge>
        )}
      </div>

      <p
        className="
          mt-5
          max-w-xl
          text-sm
          leading-6
          text-muted
        "
      >
        {product.description}
      </p>

      {/* ==================================================
          PURCHASE ACTIONS
      ================================================== */}

      <ProductActions product={product} selectedVariantId={selectedVariantId} quantity={quantity} onVariantChange={setSelectedVariantId} onQuantityChange={setQuantity} />
    </div>
  );
}
