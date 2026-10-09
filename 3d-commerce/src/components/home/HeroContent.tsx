"use client";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import { Button } from "@/components/ui/Button";

import type { HeroProduct } from "@/config/hero-products";

interface HeroContentProps {
  product: HeroProduct;
}

export function HeroContent({
  product,
}: HeroContentProps) {
  return (
    <AnimatePresence
      mode="wait"
      initial={false}
    >
      <motion.div
        key={product.id}
        initial={{
          opacity: 0,
          x: -55,
          filter: "blur(8px)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
        }}
        exit={{
          opacity: 0,
          x: -30,
          filter: "blur(6px)",
        }}
        transition={{
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative max-w-[580px]"
      >
        <h1 className="mb-3 max-w-[580px] text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:mb-5 sm:text-xs sm:tracking-[0.28em]">
          Premium 3D Printed Models &amp; Collectibles
        </h1>

        <h2 className="max-w-[600px] text-3xl font-semibold leading-[0.94] tracking-[-0.055em] text-foreground sm:text-5xl sm:text-6xl lg:text-[clamp(4rem,5.8vw,6.5rem)]">
          {product.name}
        </h2>

        <p className="mt-3 max-w-[510px] text-xs leading-5 text-muted sm:mt-6 sm:text-lg sm:leading-7">
          {product.description}
        </p>

        <div className="mt-4 sm:mt-8">
          <span className="text-sm text-muted">Starting from</span>

          <div className="mt-1 text-2xl font-semibold sm:text-3xl tracking-tight text-foreground sm:text-4xl">
            ₹
            {product.price.toLocaleString(
              "en-IN",
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-9 sm:gap-3">
          <Button href={`/product/${product.slug}`}>
            View Model
            <span className="ml-2">→</span>
          </Button>

          <motion.div
            className="relative overflow-hidden rounded-full"
            animate={{
              scale: [1, 1.025, 1],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{
              scale: 1.045,
            }}
            whileTap={{
              scale: 0.98,
            }}
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_15%,rgba(139,92,246,0.08)_35%,rgba(139,92,246,0.65)_50%,rgba(139,92,246,0.08)_65%,transparent_85%)] bg-[length:220%_100%]"
              animate={{
                backgroundPosition: ["120% 0", "-120% 0"],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-primary/25" />
            <span className="relative block rounded-full">
              <Button href="/custom" variant="outline">
                Build Custom Pack
              </Button>
            </span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
