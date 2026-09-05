"use client";

import Link from "next/link";
import { useState } from "react";

import {
  IconCheck,
  IconEye,
  IconHeart,
  IconShoppingCart,
  IconStar,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import {
  useWishlist,
  type WishlistProduct,
} from "@/context/WishlistContext";
import type { TrendingProduct } from "@/config/trending-products";

function RatingStars({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, rating));

  return (
    <div
      className="flex items-center"
      aria-label={`${safeRating} out of 5 stars`}
    >
      <div className="flex">
        {Array.from({ length: 5 }).map((_, index) => {
          const fill = Math.max(0, Math.min(1, safeRating - index));

          return (
            <span
              key={index}
              className="relative h-3 w-3 sm:h-3.5 sm:w-3.5"
            >
              <IconStar
                size={11}
                stroke={1.5}
                className="absolute text-muted/30 sm:hidden"
              />

              <IconStar
                size={13}
                stroke={1.5}
                className="absolute hidden text-muted/30 sm:block"
              />

              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <IconStar
                    size={11}
                    stroke={1.5}
                    className="fill-current text-warning sm:hidden"
                  />

                  <IconStar
                    size={13}
                    stroke={1.5}
                    className="hidden fill-current text-warning sm:block"
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>

      <span className="ml-1 text-[9px] font-medium text-muted sm:ml-1.5 sm:text-[11px]">
        {safeRating.toFixed(1)}
      </span>
    </div>
  );
}

interface TrendingProductCardProps {
  product: TrendingProduct;
}

export function TrendingProductCard({
  product,
}: TrendingProductCardProps) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [added, setAdded] = useState(false);

  const liked = isInWishlist(product.id);
  const wishlistProduct: WishlistProduct = product;

  const handleWishlistClick = () => {
    toggleWishlist(wishlistProduct);
  };

  const handleAddToCart = () => {
    addItem(product, "medium", 1);

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1600);
  };

  return (
    <article className="group min-w-0">
      <div className="card-premium overflow-hidden rounded-xl">
        <div className="relative aspect-[0.84/1] overflow-hidden bg-[#0c0c0c]">
          <Link
            href={`/product/${product.id}`}
            className="block h-full"
          >
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
            <div className="absolute left-2 top-2 border border-primary/30 bg-black/45 px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-[0.1em] text-primary-hover backdrop-blur-md sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[9px]">
              {product.badge}
            </div>
          )}

          {product.discount && (
            <div className="absolute left-2 top-8 border border-white/10 bg-black/40 px-1.5 py-0.5 text-[7px] font-medium text-white/70 backdrop-blur-md sm:left-3 sm:top-10 sm:px-2 sm:py-1 sm:text-[9px]">
              {product.discount}
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            ariaLabel={
              liked
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            onClick={handleWishlistClick}
            className={`absolute right-2 top-2 !h-7 !min-h-7 !w-7 !rounded-full !border !p-0 backdrop-blur-md sm:right-2.5 sm:top-2.5 sm:!h-8 sm:!min-h-8 sm:!w-8 ${
              liked
                ? "!border-primary/50 !bg-primary/15 !text-primary"
                : "!border-white/10 !bg-black/35 !text-white/80 hover:!border-primary/50 hover:!bg-primary/15 hover:!text-primary-hover"
            }`}
          >
            <IconHeart
              size={13}
              stroke={1.7}
              fill={liked ? "currentColor" : "none"}
            />
          </Button>

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

          <Link
            href={`/product/${product.id}`}
            className="block"
          >
            <h3 className="mt-1 line-clamp-2 min-h-[2.25rem] text-[11px] font-medium leading-4 tracking-[-0.015em] text-foreground transition-colors hover:text-primary-hover sm:mt-1.5 sm:min-h-[2.5rem] sm:text-sm sm:leading-5">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-center">
              <RatingStars rating={product.rating} />

              <span className="ml-1 text-[8px] text-muted sm:text-[10px]">
                ({product.reviewCount})
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-2.5">
            <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold tracking-[-0.02em] text-foreground sm:text-sm">
                ₹{product.price.toLocaleString("en-IN")}
              </span>

              {product.oldPrice && (
                <span className="text-[8px] text-muted-foreground line-through sm:text-[10px]">
                  ₹{product.oldPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

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