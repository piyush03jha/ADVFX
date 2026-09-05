"use client";

import Link from "next/link";

import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";

import type { Product } from "@/config/products";

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({
  products,
}: RelatedProductsProps) {
  if (!products.length) {
    return null;
  }

  const handleProductClick = () => {
    /*
     * Make sure the next product page starts
     * at the top instead of preserving the
     * current Related Products scroll position.
     */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  };

  return (
    <section
      className="
        border-t
        border-border
        pt-10
        sm:pt-12
      "
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="
          mb-7
          flex
          items-end
          justify-between
          gap-4
        "
      >
        <div>
          <p
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-primary
            "
          >
            Continue exploring
          </p>

          <h2
            className="
              mt-3
              text-2xl
              font-semibold
              tracking-[-0.035em]
              text-foreground
              sm:text-3xl
            "
          >
            You May Also Like
          </h2>
        </div>

        <Link
          href="/shop"
          className="
            hidden
            items-center
            gap-1
            text-xs
            text-muted
            transition-colors
            hover:text-primary
            sm:flex
          "
        >
          View all
          <IconArrowUpRight size={14} />
        </Link>
      </div>

      {/* ==================================================
          PRODUCTS
      ================================================== */}

      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-3
          lg:grid-cols-4
        "
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            scroll={true}
            onClick={handleProductClick}
            className="group"
          >
            <Card
              interactive
              className="
                overflow-hidden
                rounded-2xl
              "
            >
              <div
                className="
                  relative
                  aspect-[0.85/1]
                  overflow-hidden
                  bg-[#0c0c0c]
                "
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
                    group-hover:scale-105
                  "
                />

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    bg-gradient-to-t
                    from-black/60
                    via-transparent
                    to-transparent
                  "
                />

                {product.badge && (
                  <div
                    className="
                      absolute
                      left-2.5
                      top-2.5
                    "
                  >
                    <Badge variant="primary">
                      {product.badge}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p
                  className="
                    text-[8px]
                    uppercase
                    tracking-[0.15em]
                    text-muted
                  "
                >
                  {product.category}
                </p>

                <h3
                  className="
                    mt-1.5
                    truncate
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  {product.name}
                </h3>

                <Rating
                  value={product.rating}
                  reviewCount={
                    product.reviewCount
                  }
                  size={10}
                  className="mt-2"
                />

                <Price
                  value={product.price}
                  size="sm"
                  className="mt-2"
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}