"use client";

import { useEffect } from "react";

const VIEW_SESSION_PREFIX = "forma_product_viewed:";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const key = VIEW_SESSION_PREFIX + productId;

    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Metrics are best-effort when browser storage is unavailable.
    }

    void fetch(`/api/products/${encodeURIComponent(productId)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [productId]);

  return null;
}
