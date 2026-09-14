"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
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
  const [isModelHeld, setIsModelHeld] = useState(false);
  const rotationStartedAtRef = useRef(Date.now());
  const remainingTimeRef = useRef(HERO_MODEL_ROTATION_MS);
  const timeoutRef = useRef<number | null>(null);

  const clearRotationTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNextProduct = useCallback(
    (delay: number = HERO_MODEL_ROTATION_MS) => {
      clearRotationTimer();
      rotationStartedAtRef.current = Date.now();

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        remainingTimeRef.current = HERO_MODEL_ROTATION_MS;

        startTransition(() => {
          setActiveIndex(
            (current) => (current + 1) % heroProducts.length,
          );
        });
      }, Math.max(0, delay));
    },
    [clearRotationTimer],
  );

  useEffect(() => {
    if (heroProducts.length <= 1) {
      return;
    }

    scheduleNextProduct(remainingTimeRef.current);

    return clearRotationTimer;
  }, [clearRotationTimer, scheduleNextProduct]);

  const handleModelHoldChange = useCallback(
    (held: boolean) => {
      if (heroProducts.length <= 1) {
        return;
      }

      if (held) {
        if (!isModelHeld) {
          const elapsed =
            Date.now() - rotationStartedAtRef.current;
          remainingTimeRef.current = Math.max(
            HERO_MODEL_ROTATION_MS - elapsed,
            0,
          );
          clearRotationTimer();
        }

        setIsModelHeld(true);
        return;
      }

      if (isModelHeld) {
        setIsModelHeld(false);
        scheduleNextProduct(remainingTimeRef.current);
      }
    },
    [clearRotationTimer, isModelHeld, scheduleNextProduct],
  );

  const handleProductChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      remainingTimeRef.current = HERO_MODEL_ROTATION_MS;
      if (!isModelHeld) {
        scheduleNextProduct();
      }
    },
    [isModelHeld, scheduleNextProduct],
  );

  const activeProduct = heroProducts[activeIndex];

  return (
    <section
      className="relative isolate overflow-hidden min-h-[720px] pb-10 lg:min-h-[calc(100svh-5rem)] lg:pb-0"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_55%_25%,rgba(139,92,246,0.13),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)] lg:bg-[radial-gradient(circle_at_60%_40%,rgba(139,92,246,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 left-1/2 top-[5rem] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-primary/[0.075] blur-[100px] lg:right-[-12%] lg:left-auto lg:top-[18%] lg:h-[70%] lg:w-[58%] lg:translate-x-0 lg:bg-primary/[0.035] lg:blur-[120px]"
      />

      <Container className="relative min-h-[720px] py-0 lg:min-h-[calc(100svh-5rem)] lg:py-8 xl:py-10">
        <div
          className="absolute z-10 left-1/2 top-[3.5rem] h-[300px] w-[390px] -translate-x-1/2 sm:top-[4rem] sm:h-[340px] sm:w-[460px] lg:right-[-8%] lg:left-auto lg:top-1/2 lg:h-[min(82vw,780px)] lg:w-[min(72vw,820px)] lg:-translate-x-0 lg:-translate-y-1/2 xl:right-[-5%] xl:h-[min(88vh,820px)] xl:w-[min(64vw,900px)]"
        >
          <HeroProductStage
            products={heroProducts}
            activeIndex={activeIndex}
            onHoldChange={handleModelHoldChange}
          />
        </div>

        <div className="relative z-30 flex min-h-[720px] items-start pt-[340px] sm:pt-[390px] lg:min-h-[calc(100svh-5rem)] lg:w-[52%] lg:items-center lg:pt-0">
          <HeroContent product={activeProduct} />
        </div>

        <div className="hidden sm:block">
          <HeroPagination
            count={heroProducts.length}
            activeIndex={activeIndex}
            onChange={handleProductChange}
          />
        </div>
      </Container>
    </section>
  );
}
