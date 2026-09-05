"use client";

import { motion } from "motion/react";
import {
  IconArrowUpRight,
  IconStar,
} from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";
import { reviews } from "@/config/reviews";

/* =========================================================
   STARS
========================================================= */

function Stars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <IconStar
          key={index}
          size={13}
          stroke={1.5}
          className={
            index < rating
              ? "fill-current text-primary"
              : "text-muted/20"
          }
        />
      ))}
    </div>
  );
}

/* =========================================================
   REVIEWER
========================================================= */

function Reviewer({
  review,
}: {
  review: (typeof reviews)[number];
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-border
          bg-background
          text-[9px]
          font-medium
          text-foreground
        "
      >
        {review.initials}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {review.name}
        </p>

        <p className="mt-1 truncate text-[9px] uppercase tracking-[0.1em] text-muted">
          {review.location}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT
========================================================= */

function ProductTag({
  product,
}: {
  product: string;
}) {
  return (
    <span
      className="
        inline-flex
        max-w-full
        items-center
        gap-2
        truncate
        text-[8px]
        font-medium
        uppercase
        tracking-[0.14em]
        text-primary
      "
    >
      <span className="h-px w-4 shrink-0 bg-primary/60" />

      <span className="truncate">
        {product}
      </span>
    </span>
  );
}

/* =========================================================
   REVIEW CARD
========================================================= */

function ReviewCard({
  review,
  index,
}: {
  review: (typeof reviews)[number];
  index: number;
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 20,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
      }}
      className="
        group
        flex
        h-full
        min-h-[320px]
        min-w-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-surface/60
        p-6
        transition-all
        duration-500
        hover:border-primary/25
        hover:bg-surface
        sm:min-h-[340px]
        lg:min-h-[360px]
      "
    >
      {/* Top */}

      <div className="flex shrink-0 items-center justify-between">
        <Stars rating={review.rating} />

        <IconArrowUpRight
          size={17}
          stroke={1.4}
          className="
            shrink-0
            text-muted
            transition-all
            duration-300
            group-hover:-translate-y-0.5
            group-hover:translate-x-0.5
            group-hover:text-primary
          "
        />
      </div>

      {/* Quote */}

      <div className="flex min-h-0 flex-1 items-center py-8">
        <p
          className="
            line-clamp-6
            w-full
            overflow-hidden
            font-serif
            text-lg
            leading-[1.35]
            tracking-[-0.02em]
            text-foreground
            sm:text-xl
          "
        >
          “{review.text}”
        </p>
      </div>

      {/* Bottom */}

      <div className="mt-auto shrink-0 border-t border-border pt-5">
        <Reviewer review={review} />

        <div className="mt-4">
          <ProductTag product={review.product} />
        </div>
      </div>
    </motion.article>
  );
}

/* =========================================================
   REVIEWS
========================================================= */

export function Reviews() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28 lg:py-32">
      {/* Ambient background */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-200px]
          -z-10
          h-[500px]
          w-[700px]
          -translate-x-1/2
          rounded-full
          bg-primary/[0.035]
          blur-[140px]
        "
      />

      <Container>
        {/* ===================================================
            HEADER
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.7,
          }}
          className="
            mb-12
            flex
            flex-col
            gap-8
            sm:mb-14
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          {/* Heading */}

          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-primary" />

              <span
                className="
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.25em]
                  text-primary
                "
              >
                Reviews
              </span>
            </div>

            <h2
              className="
                mt-4
                font-serif
                text-4xl
                leading-[0.92]
                tracking-[-0.045em]
                text-foreground
                sm:text-5xl
                lg:text-6xl
              "
            >
              Loved by{" "}
              <span className="italic text-muted">
                collectors.
              </span>
            </h2>
          </div>

          {/* Rating */}

          <div
            className="
              flex
              items-center
              gap-5
              border-l
              border-border
              pl-5
            "
          >
            <div>
              <p
                className="
                  font-serif
                  text-4xl
                  leading-none
                  tracking-[-0.04em]
                  text-foreground
                "
              >
                4.9
              </p>

              <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-muted">
                Average
              </p>
            </div>

            <div>
              <Stars rating={5} />

              <p className="mt-2 text-[9px] text-muted">
                1,200+ reviews
              </p>
            </div>
          </div>
        </motion.div>

        {/* ===================================================
            ONE ROW GRID
        ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-4
            lg:auto-rows-fr
          "
        >
          {reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              index={index}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}