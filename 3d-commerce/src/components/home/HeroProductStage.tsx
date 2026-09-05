"use client";

import { ProductViewer } from "@/components/3d/ProductViewer";

import type { HeroProduct } from "@/config/hero-products";

interface HeroProductStageProps {
  products: HeroProduct[];
  activeIndex: number;
}

export function HeroProductStage({
  products,
  activeIndex,
}: HeroProductStageProps) {
  if (!products.length) {
    return null;
  }

  return (
    <div
      className="
        relative
        h-full
        w-full
      "
    >
      <ProductViewer
        products={products}
        activeIndex={activeIndex}
      />
    </div>
  );
}