import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";

import type { StorefrontProduct } from "@/lib/catalog-api";

import { ProductActions } from "./ProductActions";

interface ProductInfoProps {
  product: StorefrontProduct;
}

export function ProductInfo({
  product,
}: ProductInfoProps) {
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

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
        <Price
          value={product.price}
          size="lg"
        />

        {product.oldPrice && (
          <span
            className="
              mb-1
              text-sm
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

          {product.discount && (
            <Badge variant="primary" className="mb-1 rounded-md px-2 py-1 font-semibold">
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

      <ProductActions product={product} />
    </div>
  );
}
