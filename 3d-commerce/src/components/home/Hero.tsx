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
import type { HeroProduct } from "@/config/hero-products";
import { getBackendApiUrl } from "@/lib/backend-api";

import { HeroContent } from "./HeroContent";
import { HeroPagination } from "./HeroPagination";
import { HeroProductStage } from "./HeroProductStage";

export function Hero() {
  const [heroProducts, setHeroProducts] = useState<HeroProduct[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isModelHeldRef = useRef(false);
  const rotationStartedAtRef = useRef(Date.now());
  const remainingTimeRef = useRef(HERO_MODEL_ROTATION_MS);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHeroProducts = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetch(getBackendApiUrl("products/hero"), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Hero request failed with ${response.status}`);
        }

        const data = (await response.json()) as HeroProduct[];

        if (!cancelled) {
          setHeroProducts(Array.isArray(data) ? data : []);
          setActiveIndex(0);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHeroProducts([]);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    void loadHeroProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const clearRotationTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNextProduct = useCallback(
    (delay: number = HERO_MODEL_ROTATION_MS) => {
      if (isModelHeldRef.current || heroProducts.length <= 1) return;

      clearRotationTimer();
      rotationStartedAtRef.current = Date.now();

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        remainingTimeRef.current = HERO_MODEL_ROTATION_MS;

        startTransition(() => {
          setActiveIndex((current) => (current + 1) % heroProducts.length);
        });
      }, Math.max(0, delay));
    },
    [clearRotationTimer, heroProducts.length],
  );

  useEffect(() => {
    if (heroProducts.length <= 1) return;

    scheduleNextProduct(remainingTimeRef.current);

    return clearRotationTimer;
  }, [clearRotationTimer, scheduleNextProduct, heroProducts.length]);

  const handleModelHoldChange = useCallback(
    (held: boolean) => {
      isModelHeldRef.current = held;

      if (held) {
        const elapsed = Date.now() - rotationStartedAtRef.current;
        remainingTimeRef.current = Math.max(
          HERO_MODEL_ROTATION_MS - elapsed,
          0,
        );
        clearRotationTimer();
        return;
      }

      scheduleNextProduct(remainingTimeRef.current);
    },
    [clearRotationTimer, scheduleNextProduct],
  );

  const handleProductChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      remainingTimeRef.current = HERO_MODEL_ROTATION_MS;

      if (!isModelHeldRef.current) {
        scheduleNextProduct();
      }
    },
    [scheduleNextProduct],
  );

  if (isLoading) {
    return (
      <section className="relative isolate min-h-[720px] overflow-hidden">
        <Container className="relative flex min-h-[720px] items-center justify-center">
          <div
            role="status"
            aria-live="polite"
            className="rounded-full border border-foreground/10 bg-background/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted backdrop-blur-md"
          >
            Loading hero
          </div>
        </Container>
      </section>
    );
  }

  if (hasError || !heroProducts.length) {
    const message = hasError
      ? "We couldn't load featured products right now."
      : "No featured hero products have been published yet.";

    return (
      <section className="relative isolate min-h-[720px] overflow-hidden">
        <Container className="relative flex min-h-[720px] items-center justify-center">
          <div className="max-w-md text-center">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">
              Premium 3D Collection
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Explore our collection
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">
              {message}
            </p>
            {hasError && (
              <p className="mt-2 text-xs text-muted/70">
                The storefront will use featured catalog products as soon as the catalog service is available.
              </p>
            )}
          </div>
        </Container>
      </section>
    );
  }

  const activeProduct = heroProducts[activeIndex] ?? heroProducts[0];

  return (
    <section className="relative isolate overflow-hidden min-h-[720px] pb-10 lg:min-h-[calc(100svh-5rem)] lg:pb-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_55%_25%,rgba(139,92,246,0.13),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)] lg:bg-[radial-gradient(circle_at_60%_40%,rgba(139,92,246,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 left-1/2 top-[5rem] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-primary/[0.075] blur-[100px] lg:right-[-12%] lg:left-auto lg:top-[18%] lg:h-[70%] lg:w-[58%] lg:translate-x-0 lg:bg-primary/[0.035] lg:blur-[120px]"
      />

      <Container className="relative min-h-[720px] py-0 lg:min-h-[calc(100svh-5rem)] lg:py-8 xl:py-10">
        <div className="absolute z-10 left-1/2 top-[3.5rem] h-[300px] w-[390px] -translate-x-1/2 sm:top-[4rem] sm:h-[340px] sm:w-[460px] lg:right-[-8%] lg:left-auto lg:top-1/2 lg:h-[min(82vw,780px)] lg:w-[min(72vw,820px)] lg:-translate-x-0 lg:-translate-y-1/2 xl:right-[-5%] xl:h-[min(88vh,820px)] xl:w-[min(64vw,900px)]">
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
