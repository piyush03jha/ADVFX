"use client";

import { motion, useReducedMotion } from "motion/react";

import {
  IconArrowLeft,
  IconArrowRight,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Section } from "@/components/ui/Section";

import { trendingProducts } from "@/config/trending-products";

import { TrendingProductCard } from "./TrendingProductCard";

export function TrendingNow() {
  const shouldReduceMotion = useReducedMotion();

  const scroll = (
    direction: "left" | "right",
  ) => {
    const container =
      document.getElementById(
        "trending-products",
      );

    if (!container) return;

    const amount =
      container.clientWidth * 0.75;

    container.scrollBy({
      left:
        direction === "right"
          ? amount
          : -amount,
      behavior: "smooth",
    });
  };

  return (
    <Section
      id="trending"
      glow
      className="
        overflow-hidden
        py-12
        sm:py-20
        lg:py-28
      "
    >
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
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
          mb-6
          flex
          items-end
          justify-between
          gap-4

          sm:mb-9
          sm:gap-6
        "
      >
        <div>
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
            Trending Now
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

              lg:text-5xl
            "
          >
            What Collectors Want
          </h2>
        </div>

        {/* Desktop controls */}

        <div className="hidden gap-2 sm:flex">
          <IconButton
            label="Previous products"
            size="sm"
            onClick={() => scroll("left")}
          >
            <IconArrowLeft
              size={16}
              stroke={1.7}
            />
          </IconButton>

          <IconButton
            label="Next products"
            size="sm"
            onClick={() => scroll("right")}
          >
            <IconArrowRight
              size={16}
              stroke={1.7}
            />
          </IconButton>
        </div>
      </motion.div>

      {/* =================================================
          PRODUCT RAIL

          Mobile:
          Small cards with horizontal scrolling.

          Desktop:
          Existing card width remains 224px.
      ================================================== */}

      <div
        id="trending-products"
        className="
          -mx-5
          flex
          gap-3
          overflow-x-auto
          overscroll-x-contain
          pb-4
          snap-x
          snap-mandatory
          px-5

          sm:-mx-8
          sm:gap-4
          sm:px-8

          lg:mx-0
          lg:px-0

          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {trendingProducts.map(
          (product, index) => (
            <motion.div
              key={product.id}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: 25,
                    }
              }
              whileInView={
                shouldReduceMotion
                  ? undefined
                  : {
                      opacity: 1,
                      x: 0,
                    }
              }
              viewport={{
                once: true,
                amount: 0.1,
              }}
              transition={{
                duration: 0.5,
                delay: Math.min(
                  index * 0.035,
                  0.3,
                ),
              }}
              className="
                w-[48vw]
                min-w-[150px]
                max-w-[185px]
                shrink-0
                snap-start

                min-[400px]:w-[42vw]

                sm:w-[38vw]
                sm:min-w-[180px]
                sm:max-w-[210px]

                lg:w-[224px]
                lg:min-w-[224px]
                lg:max-w-[224px]
              "
            >
              <TrendingProductCard
                product={product}
              />
            </motion.div>
          ),
        )}
      </div>

      {/* =================================================
          MOBILE HINT
      ================================================== */}

      <div
        className="
          mt-2
          flex
          items-center
          justify-between
          sm:hidden
        "
      >
        <span
          className="
            text-[9px]
            uppercase
            tracking-[0.15em]
            text-muted
          "
        >
          Swipe to explore
        </span>

        <div className="flex gap-1.5">
          <span className="h-1 w-5 rounded-full bg-primary" />
          <span className="h-1 w-1 rounded-full bg-muted/30" />
          <span className="h-1 w-1 rounded-full bg-muted/30" />
        </div>
      </div>

      {/* =================================================
          VIEW ALL
      ================================================== */}

      <div className="mt-6 flex justify-center sm:mt-8">
        <Button
          href="/models"
          variant="outline"
          size="sm"
        >
          Explore All Models
        </Button>
      </div>
    </Section>
  );
}