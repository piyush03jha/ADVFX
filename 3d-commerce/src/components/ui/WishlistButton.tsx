"use client";

import { IconHeart } from "@tabler/icons-react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

import { cn } from "@/lib/utils";
import {
  useWishlist,
  type WishlistProduct,
} from "@/context/WishlistContext";

type WishlistButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type" | "onClick"
> & {
  product: WishlistProduct;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/** A product-card control that adds or removes its product from the wishlist. */
export function WishlistButton({
  product,
  className,
  onClick,
  ...props
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product);
    onClick?.(event);
  };

  return (
    <button
      {...props}
      type="button"
      aria-label={
        isWishlisted
          ? `Remove ${product.name} from wishlist`
          : `Add ${product.name} to wishlist`
      }
      aria-pressed={isWishlisted}
      onClick={handleClick}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500 bg-white text-red-500 shadow-none transition-[background-color,border-color,color,transform] duration-200 hover:bg-red-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:hover:bg-red-50",
        className,
      )}
    >
      <IconHeart
        size={14}
        stroke={1.8}
        fill={isWishlisted ? "currentColor" : "none"}
      />
    </button>
  );
}
