"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { Section } from "@/components/ui/Section";

import {
  newArrivals,
  bestSellers,
} from "@/config/new-arrivals";

import { ProductListThumbnail } from "./ProductListThumbnail";

export function NewArrivals() {
  const shouldReduceMotion =
    useReducedMotion();

  return (
    <Section
      glow
      className="
        py-12
        sm:py-20
        lg:py-28
      "
    >
      <div
        className="
          grid
          gap-12

          sm:gap-14

          lg:grid-cols-2
          lg:gap-16
        "
      >
        {/* =================================================
            NEW ARRIVALS
        ================================================== */}

        <ProductColumn
          eyebrow="Fresh In"
          title="New Arrivals"
          products={newArrivals}
          shouldReduceMotion={
            shouldReduceMotion
          }
          href="/models?sort=newest"
          linkText="View all new arrivals"
          type="new"
        />

        {/* =================================================
            BEST SELLERS
        ================================================== */}

        <div className="hidden sm:block">
          <ProductColumn
            eyebrow="Most Loved"
            title="Best Sellers"
            products={bestSellers}
            shouldReduceMotion={shouldReduceMotion}
            href="/models?sort=popular"
            linkText="View all best sellers"
            type="best"
          />
        </div>
      </div>
    </Section>
  );
}

/* =========================================================
   PRODUCT COLUMN
========================================================= */

function ProductColumn({
  eyebrow,
  title,
  products,
  shouldReduceMotion,
  href,
  linkText,
  type,
}: {
  eyebrow: string;
  title: string;
  products: typeof newArrivals;
  shouldReduceMotion: boolean | null;
  href: string;
  linkText: string;
  type: "new" | "best";
}) {
  return (
    <div className="min-w-0">
      {/* =================================================
          HEADER
      ================================================== */}

      <motion.div
        initial={
          shouldReduceMotion
            ? false
            : {
                opacity: 0,
                y: 18,
              }
        }
        whileInView={
          shouldReduceMotion
            ? undefined
            : {
                opacity: 1,
                y: 0,
              }
        }
        viewport={{
          once: true,
          amount: 0.2,
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
          mb-5

          sm:mb-7
        "
      >
        <p
          className="
            text-[9px]
            font-medium
            uppercase
            tracking-[0.22em]
            text-primary

            sm:text-[10px]
          "
        >
          {eyebrow}
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-semibold
            leading-tight
            tracking-[-0.045em]
            text-foreground

            sm:mt-3
            sm:text-4xl
          "
        >
          {title}
        </h2>
      </motion.div>

      {/* =================================================
          PRODUCTS
      ================================================== */}

      <div className="space-y-2.5 sm:space-y-3">
        {products.map(
          (product, index) => (
            <motion.div
              key={product.id}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 15,
                    }
              }
              whileInView={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: 1,
                      y: 0,
                    }
              }
              viewport={{
                once: true,
                amount: 0.15,
              }}
              transition={{
                duration: 0.5,
                delay: shouldReduceMotion
                  ? 0
                  : index * 0.06,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
            >
              <Link
                href={`/product/${product.id}`}
                className="group block"
              >
                <Card
                  interactive
                  className="
                    flex
                    min-h-[76px]
                    items-center
                    gap-2
                    rounded-xl
                    p-2

                    sm:min-h-[88px]
                    sm:gap-3
                    sm:p-2.5
                  "
                >
                  {/* =================================================
                      RANK
                  ================================================== */}

                  {type === "best" && (
                    <span
                      className="
                        w-4
                        shrink-0
                        text-center
                        text-[9px]
                        font-medium
                        text-primary/60

                        sm:w-5
                        sm:text-xs
                      "
                    >
                      {String(
                        index + 1,
                      ).padStart(2, "0")}
                    </span>
                  )}

                  {/* =================================================
                      THUMBNAIL
                  ================================================== */}

                  <div
                    className="
                      h-[58px]
                      w-[58px]
                      shrink-0
                      overflow-hidden
                      rounded-lg

                      sm:h-[72px]
                      sm:w-[72px]
                    "
                  >
                    <ProductListThumbnail
                      model={product.model}
                    />
                  </div>

                  {/* =================================================
                      PRODUCT INFO
                  ================================================== */}

                  <div className="min-w-0 flex-1">
                    <h3
                      className="
                        truncate
                        text-[11px]
                        font-medium
                        leading-4
                        text-foreground
                        transition-colors
                        group-hover:text-primary-hover

                        sm:text-sm
                        sm:leading-5
                      "
                    >
                      {product.name}
                    </h3>

                    {/* Category */}

                    <Badge
                      variant="default"
                      className="
                        mt-1
                        px-1.5
                        py-0.5
                        text-[7px]

                        sm:mt-1.5
                        sm:px-2.5
                        sm:py-1
                        sm:text-[8px]
                      "
                    >
                      {product.category}
                    </Badge>

                    {/* Rating */}

                    {product.rating !==
                      undefined &&
                      product.reviewCount !==
                        undefined && (
                        <Rating
                          value={
                            product.rating
                          }
                          reviewCount={
                            product.reviewCount
                          }
                          size={10}
                          className="
                            mt-1

                            sm:mt-1.5
                          "
                        />
                      )}

                    {/* Price */}

                    <Price
                      value={product.price}
                      size="sm"
                      className="
                        mt-1
                        text-sm

                        sm:mt-1.5
                      "
                    />
                  </div>

                  {/* =================================================
                      NEW BADGE
                  ================================================== */}

                  {type === "new" && (
                    <Badge
                      variant="success"
                      className="
                        hidden
                        shrink-0
                        text-[8px]

                        sm:inline-flex
                      "
                    >
                      New
                    </Badge>
                  )}

                  {/* =================================================
                      ARROW
                  ================================================== */}

                  <IconArrowUpRight
                    size={14}
                    stroke={1.7}
                    className="
                      shrink-0
                      text-muted
                      transition-all
                      duration-300
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                      group-hover:text-primary

                      sm:size-[15px]
                    "
                  />
                </Card>
              </Link>
            </motion.div>
          ),
        )}
      </div>

      {/* =================================================
          VIEW ALL
      ================================================== */}

      <Button
        href={href}
        variant="ghost"
        size="sm"
        className="
          mt-4
          !px-2
          text-xs

          sm:mt-5
        "
      >
        {linkText}

        <IconArrowUpRight
          size={13}
          stroke={1.7}
        />
      </Button>
    </div>
  );
}