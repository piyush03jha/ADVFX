"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Section } from "@/components/ui/Section";

import { shopCategories } from "@/config/shop-catogery";

export function ShopByCategory() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Section
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

      <div
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
            Explore the collection
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
            Shop by Category
          </h2>
        </motion.div>

        {/* Desktop View All */}

        <Button
          href="/categories"
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
        >
          View All

          <IconArrowUpRight
            size={16}
            stroke={1.7}
          />
        </Button>
      </div>

      {/* =================================================
          MOBILE HORIZONTAL RAIL

          On mobile:
          - 2 cards are approximately visible
          - Remaining cards scroll horizontally
          - No ugly scrollbar
      ================================================== */}

      <div
        className="
          -mx-5
          flex
          gap-3
          overflow-x-auto
          overscroll-x-contain
          px-5
          pb-3
          snap-x
          snap-mandatory

          sm:-mx-8
          sm:px-8

          lg:hidden

          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {shopCategories.map(
          (category, index) => (
            <motion.div
              key={category.id}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: 20,
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
                delay: shouldReduceMotion
                  ? 0
                  : Math.min(
                      index * 0.04,
                      0.25,
                    ),
              }}
              className="
                w-[68vw]
                shrink-0
                snap-start

                min-[400px]:w-[58vw]

                sm:w-[42vw]
              "
            >
              <CategoryCard
                category={category}
                index={index}
              />
            </motion.div>
          ),
        )}
      </div>

      {/* =================================================
          DESKTOP GRID

          4 columns × 2 rows
      ================================================== */}

      <div
        className="
          hidden
          grid-cols-4
          gap-4
          lg:grid
        "
      >
        {shopCategories.map(
          (category, index) => (
            <motion.div
              key={category.id}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 22,
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
                amount: 0.1,
              }}
              transition={{
                duration: 0.55,
                delay: shouldReduceMotion
                  ? 0
                  : Math.min(
                      index * 0.045,
                      0.3,
                    ),
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
            >
              <CategoryCard
                category={category}
                index={index}
              />
            </motion.div>
          ),
        )}
      </div>

      {/* =================================================
          MOBILE SCROLL HINT
      ================================================== */}

      <div
        className="
          mt-2
          flex
          items-center
          justify-between
          lg:hidden
        "
      >
        <span
          className="
            text-[9px]
            uppercase
            tracking-[0.16em]
            text-muted
          "
        >
          Swipe to explore
        </span>

        <div className="flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-full bg-primary" />
          <span className="h-1 w-1 rounded-full bg-muted/30" />
          <span className="h-1 w-1 rounded-full bg-muted/30" />
        </div>
      </div>
    </Section>
  );
}

/* =====================================================
   REUSABLE CATEGORY CARD
===================================================== */

function CategoryCard({
  category,
  index,
}: {
  category: (typeof shopCategories)[number];
  index: number;
}) {
  return (
        <Link
      href={`/shop/${category.slug}`}
      className="group block"
    >
      <Card
        interactive
        className="
          relative
          aspect-[1/1.1]
          rounded-2xl

          sm:aspect-[1/1.2]

          lg:aspect-[1.15/1]
        "
      >
        {/* IMAGE */}

        <img
          src={category.image}
          alt={category.name}
          loading={
            index < 4
              ? "eager"
              : "lazy"
          }
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            transition-transform
            duration-700
            ease-[cubic-bezier(0.22,1,0.36,1)]
            group-hover:scale-105
          "
        />

        {/* DARK GRADIENT */}

        <div
          aria-hidden="true"
          className="
            absolute
            inset-0
            bg-gradient-to-t
            from-black
            via-black/35
            to-black/5
          "
        />

        {/* PURPLE GLOW */}

        <div
          aria-hidden="true"
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.22),transparent_55%)]
            opacity-0
            transition-opacity
            duration-500
            group-hover:opacity-100
          "
        />

        {/* ARROW */}

        <div
          className="
            absolute
            right-2.5
            top-2.5

            sm:right-3
            sm:top-3
          "
        >
          <IconButton
            label={`Open ${category.name}`}
            size="sm"
            variant="default"
            tabIndex={-1}
            className="
              h-8
              w-8
              border-white/10
              bg-black/35
              text-white
              backdrop-blur-md

              sm:h-9
              sm:w-9
            "
          >
            <IconArrowUpRight
              size={14}
              stroke={1.7}
            />
          </IconButton>
        </div>

        {/* CONTENT */}

        <div
          className="
            absolute
            bottom-0
            left-0
            right-0
            p-3

            sm:p-4

            lg:p-5
          "
        >
          <Badge
            variant="default"
            className="
              border-white/10
              bg-black/30
              px-2
              py-0.5
              text-[8px]
              text-white/70
              backdrop-blur-md

              sm:px-2.5
              sm:py-1
              sm:text-[10px]
            "
          >
            {category.itemCount} models
          </Badge>

          <h3
            className="
              mt-2
              line-clamp-2
              text-sm
              font-medium
              leading-tight
              tracking-[-0.025em]
              text-white

              sm:mt-3
              sm:text-lg

              lg:text-xl
            "
          >
            {category.name}
          </h3>
        </div>
      </Card>
    </Link>
  );
}