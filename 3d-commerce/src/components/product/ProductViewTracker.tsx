"use client";

import { useEffect } from "react";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    void fetch(`/api/products/${encodeURIComponent(productId)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [productId]);

  return null;
}
