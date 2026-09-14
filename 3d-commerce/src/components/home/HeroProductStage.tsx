"use client";

import { ProductViewer } from "@/components/3d/ProductViewer";

import type { HeroProduct } from "@/config/hero-products";

interface HeroProductStageProps {
  products: HeroProduct[];
  activeIndex: number;
  onHoldChange?: (held: boolean) => void;
}

export function HeroProductStage({
  products,
  activeIndex,
  onHoldChange,
}: HeroProductStageProps) {
  if (!products.length) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      <ProductViewer
        products={products}
        activeIndex={activeIndex}
        onHoldChange={onHoldChange}
      />
    </div>
  );
}
