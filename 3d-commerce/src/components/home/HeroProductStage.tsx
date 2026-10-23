"use client";

import dynamic from "next/dynamic";

import type { HeroProduct } from "@/config/hero-products";

// three.js + react-three-fiber are large; load them only once hero data is ready.
const ProductViewer = dynamic(
  () => import("@/components/3d/ProductViewer").then((mod) => mod.ProductViewer),
  { ssr: false },
);

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
