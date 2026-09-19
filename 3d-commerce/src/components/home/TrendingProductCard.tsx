"use client";

import Link from "next/link";
import { useState } from "react";

import {
  IconCheck,
  IconEye,
  IconShoppingCart,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { Price } from "@/components/ui/Price";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useCart } from "@/context/CartContext";
import type { StorefrontProduct } from "@/lib/catalog-api";

interface TrendingProductCardProps {
  product: StorefrontProduct;
}

export function TrendingProductCard({ product }: TrendingProductCardProps) {
  const { addItem } = useCart();

  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product, "medium", 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="group min-w-0">
      <div className="card-premium overflow-hidden rounded-xl">
        <div className="relative aspect-[0.84/1] overflow-hidden bg-[#0c0c0c]">
          <Link href={`/product/${product.id}`} className="block h-full">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
          </Link>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"
          />

          {product.badge && (
            <Badge variant="mediaPrimary" className="absolute left-2 top-2 rounded-none px-1.5 py-0.5 text-[7px] tracking-[0.1em] sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[9px]">{product.badge}</Badge>
          )}

          {product.discount && (
            <Badge variant="media" className="absolute left-2 top-8 rounded-none px-1.5 py-0.5 text-[7px] normal-case tracking-normal sm:left-3 sm:top-10 sm:px-2 sm:py-1 sm:text-[9px]">{product.discount}</Badge>
          )}

          <WishlistButton
            product={product}
            className="absolute right-2 top-2 z-10 h-7 w-7 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8"
          />

          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/25 opacity-0 backdrop-blur-[1px] transition-opacity duration-300 group-hover:opacity-100 sm:flex">
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto !min-h-9 !border-white/30 !bg-black/45 !px-4 !text-xs !text-white opacity-0 translate-y-2 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            >
              <IconEye size={14} stroke={1.7} />
              <span>Quick View</span>
            </Button>
          </div>
        </div>

        <div className="px-2.5 pb-2.5 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-muted sm:text-[9px] sm:tracking-[0.16em]">
            {product.category}
          </p>

          <Link href={`/product/${product.id}`} className="block">
            <h3 className="mt-1 line-clamp-2 min-h-[2.25rem] text-[11px] font-medium leading-4 tracking-[-0.015em] text-foreground transition-colors hover:text-primary-hover sm:mt-1.5 sm:min-h-[2.5rem] sm:text-sm sm:leading-5">
              {product.name}
            </h3>
          </Link>

          <Rating
            value={product.rating}
            reviewCount={product.reviewCount}
            size={11}
            showValue
            className="mt-2"
          />

          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-2.5">
            <Price value={product.price} size="sm" />

            <Button
              type="button"
              variant="primary"
              ariaLabel={`Add ${product.name} to cart`}
              onClick={handleAddToCart}
              className="shrink-0 !h-8 !min-h-8 !w-8 !rounded-full !p-0 shadow-[0_0_18px_rgba(139,92,246,0.22)] hover:shadow-[0_0_25px_rgba(139,92,246,0.40)] sm:!h-9 sm:!min-h-9 sm:!w-9"
            >
              {added ? (
                <IconCheck size={14} stroke={2} />
              ) : (
                <IconShoppingCart size={14} stroke={1.8} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
