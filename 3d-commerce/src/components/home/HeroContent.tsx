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
        <div className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-primary">
          Premium 3D Collection
        </div>

        <h1 className="max-w-[600px] text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[clamp(4rem,5.8vw,6.5rem)]">
          {product.name}
        </h1>

        <p className="mt-6 max-w-[510px] text-base leading-7 text-muted sm:text-lg">
          {product.description}
        </p>

        <div className="mt-8">
          <span className="text-sm text-muted">Starting from</span>

          <div className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            ₹
            {product.price.toLocaleString(
              "en-IN",
            )}
          </div>
        </div>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button href={`/product/${product.id}`}>
            View Model
            <span className="ml-2">→</span>
          </Button>

          <motion.div
            className="relative"
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
              className="pointer-events-none absolute -inset-2 rounded-[inherit] border border-primary/30"
              animate={{
                opacity: [0.15, 0.55, 0.15],
                scale: [0.96, 1.04, 0.96],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-[inherit] bg-primary/15 blur-md"
              animate={{
                opacity: [0.15, 0.4, 0.15],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <Button href="/custom" variant="outline">
              Build Custom Pack
              <motion.span
                className="ml-2 inline-block"
                animate={{
                  x: [0, 4, 0],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                →
              </motion.span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
