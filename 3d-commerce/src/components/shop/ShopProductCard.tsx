"use client";

import Link from "next/link";

import {
  IconEye,
  IconHeart,
  IconShoppingCart,
  IconCheck,
} from "@tabler/icons-react";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

import type {
  TrendingProduct,
} from "@/config/trending-products";

interface ShopProductCardProps {
  product: TrendingProduct;
}

export function ShopProductCard({
  product,
}: ShopProductCardProps) {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addItem(product, "medium", 1);
    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1600);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);
  };

  return (
    <Card
      interactive
      className="
        group
        h-full
        rounded-2xl
      "
    >
      {/* =================================================
          IMAGE
      ================================================== */}

      <div
        className="
          relative
          aspect-[0.88/1]
          overflow-hidden
          bg-[#0c0c0c]
        "
      >
        <Link
          href={`/product/${product.id}`}
          className="block h-full"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              ease-[cubic-bezier(0.22,1,0.36,1)]
              group-hover:scale-105
            "
          />
        </Link>

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-black/65
            via-transparent
            to-black/10
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.20),transparent_58%)]
            opacity-0
            transition-opacity
            duration-500
            group-hover:opacity-100
          "
        />

        {product.badge && (
          <div
            className="
              absolute
              left-3
              top-3
            "
          >
            <Badge variant="primary">
              {product.badge}
            </Badge>
          </div>
        )}

        <IconButton
          label={
            inWishlist
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          size="sm"
          variant="default"
          onClick={handleToggleWishlist}
          className={`
            absolute
            right-3
            top-3
            backdrop-blur-md
            ${
              inWishlist
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-black/35 text-white/80"
            }
          `}
        >
          <IconHeart
            size={14}
            stroke={1.6}
            fill={inWishlist ? "currentColor" : "none"}
          />
        </IconButton>

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-black/10
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
          "
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="
              pointer-events-auto
              translate-y-2
              border-white/25
              bg-black/45
              text-white
              opacity-0
              backdrop-blur-md
              transition-all
              duration-300
              group-hover:translate-y-0
              group-hover:opacity-100
            "
          >
            <IconEye size={14} />
            Quick View
          </Button>
        </div>

        {product.discount && (
          <div
            className="
              absolute
              bottom-3
              left-3
            "
          >
            <Badge
              variant="default"
              className="
                border-white/10
                bg-black/45
                text-white
                backdrop-blur-md
              "
            >
              {product.discount}
            </Badge>
          </div>
        )}
      </div>

      {/* =================================================
          INFORMATION
      ================================================== */}

      <div className="p-4 sm:p-5">
        <p
          className="
            text-[9px]
            font-medium
            uppercase
            tracking-[0.16em]
            text-muted
          "
        >
          {product.category}
        </p>

        <Link
          href={`/product/${product.id}`}
          className="block"
        >
          <h3
            className="
              mt-1.5
              min-h-[2.5rem]
              text-sm
              font-medium
              leading-5
              tracking-[-0.015em]
              text-foreground
              transition-colors
              hover:text-primary-hover
            "
          >
            {product.name}
          </h3>
        </Link>

        <Rating
          value={product.rating}
          reviewCount={product.reviewCount}
          size={12}
          className="mt-2.5"
        />

        <div
          className="
            mt-3
            flex
            items-center
            justify-between
            gap-2
          "
        >
          <div className="flex items-center gap-2">
            <Price
              value={product.price}
              size="sm"
            />

            {product.oldPrice && (
              <span
                className="
                  text-[10px]
                  text-muted
                  line-through
                "
              >
                ₹
                {product.oldPrice.toLocaleString(
                  "en-IN",
                )}
              </span>
            )}
          </div>
        </div>

        {/* Add to cart */}

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleAddToCart}
          className="mt-3 w-full"
        >
          {added ? (
            <>
              <IconCheck size={14} />
              Added to Cart
            </>
          ) : (
            <>
              <IconShoppingCart size={14} />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}