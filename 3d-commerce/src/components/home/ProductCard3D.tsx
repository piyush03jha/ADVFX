"use client";

import type { StorefrontProduct } from "@/lib/catalog-api";

interface ProductCard3DProps {
  product: StorefrontProduct;
}

export function ProductCard3D({ product }: ProductCard3DProps) {
  return (
    <div className="relative aspect-[1/0.92] w-full overflow-hidden bg-surface-elevated">
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
