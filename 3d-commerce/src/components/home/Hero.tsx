"use client";

import {
  startTransition,
  useEffect,
  useState,
} from "react";

import { Container } from "@/components/ui/Container";

import { HERO_MODEL_ROTATION_MS } from "@/config/hero-motion";
import { heroProducts } from "@/config/hero-products";

import { HeroContent } from "./HeroContent";
import { HeroPagination } from "./HeroPagination";
import { HeroProductStage } from "./HeroProductStage";

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);

  /* =====================================================
     PRODUCT ROTATION
  ====================================================== */

  useEffect(() => {
    if (heroProducts.length <= 1) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        setActiveIndex(
          (current) =>
            (current + 1) %
            heroProducts.length,
        );
      });
    }, HERO_MODEL_ROTATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeIndex]);

  const activeProduct = heroProducts[activeIndex];

  return (
    <section
      className="
        relative
        isolate
        overflow-hidden

        /* MOBILE */
        min-h-[720px]
        pb-10

        /* DESKTOP — KEEP EXISTING SIZE */
        lg:min-h-[calc(100svh-5rem)]
        lg:pb-0
      "
    >
      {/* =================================================
          BACKGROUND ATMOSPHERE
      ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          -z-10

          bg-[radial-gradient(circle_at_55%_25%,rgba(139,92,246,0.13),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)]

          lg:bg-[radial-gradient(circle_at_60%_40%,rgba(139,92,246,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)]
        "
      />

      {/* =================================================
          PURPLE MODEL GLOW
      ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -z-10

          /* MOBILE */
          left-1/2
          top-[5rem]
          h-[300px]
          w-[300px]
          -translate-x-1/2
          rounded-full
          bg-primary/[0.075]
          blur-[100px]

          /* DESKTOP — SAME AS BEFORE */
          lg:right-[-12%]
          lg:left-auto
          lg:top-[18%]
          lg:h-[70%]
          lg:w-[58%]
          lg:translate-x-0
          lg:bg-primary/[0.035]
          lg:blur-[120px]
        "
      />

      {/* =================================================
          CONTENT CONTAINER
      ================================================== */}

      <Container
        className="
          relative

          /* MOBILE */
          min-h-[720px]
          py-0

          /* DESKTOP — SAME AS BEFORE */
          lg:min-h-[calc(100svh-5rem)]
          lg:py-8
          xl:py-10
        "
      >
        {/* =================================================
            3D STAGE
        ================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            z-10

            /* ============================================
               MOBILE MODEL
            ============================================ */

            left-1/2
            top-[3.5rem]
            h-[300px]
            w-[390px]
            -translate-x-1/2

            sm:top-[4rem]
            sm:h-[340px]
            sm:w-[460px]

            /* ============================================
               DESKTOP — ORIGINAL POSITION/SIZE
            ============================================ */

            lg:right-[-8%]
            lg:left-auto
            lg:top-1/2
            lg:h-[min(82vw,780px)]
            lg:w-[min(72vw,820px)]
            lg:-translate-x-0
            lg:-translate-y-1/2

            xl:right-[-5%]
            xl:h-[min(88vh,820px)]
            xl:w-[min(64vw,900px)]
          "
        >
          <HeroProductStage
            products={heroProducts}
            activeIndex={activeIndex}
          />
        </div>

        {/* =================================================
            TEXT CONTENT
        ================================================== */}

        <div
          className="
            relative
            z-30

            /* ============================================
               MOBILE
               Model gets approximately 300–340px of
               visual space above the content.
            ============================================ */

            flex
            min-h-[720px]
            items-start
            pt-[340px]

            sm:pt-[390px]

            /* ============================================
               DESKTOP — ORIGINAL BEHAVIOUR
            ============================================ */

            lg:min-h-[calc(100svh-5rem)]
            lg:w-[52%]
            lg:items-center
            lg:pt-0
          "
        >
          <HeroContent
            product={activeProduct}
          />
        </div>

        {/* =================================================
            PAGINATION
        ================================================== */}

        <div className="hidden sm:block">
          <HeroPagination
            count={heroProducts.length}
            activeIndex={activeIndex}
            onChange={setActiveIndex}
          />
        </div>
      </Container>
    </section>
  );
}