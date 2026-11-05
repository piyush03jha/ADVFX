"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { StorefrontVariant } from "@/lib/catalog-api";

interface SelectedVariantValue {
  selectedVariantId: string | null;
  selectedVariant: StorefrontVariant | null;
  setSelectedVariantId: (id: string | null) => void;
}

const SelectedVariantContext = createContext<SelectedVariantValue | null>(null);

/**
 * Holds the size the customer picked so the buy box, description and specs
 * all follow the same selection.
 */
export function SelectedVariantProvider({
  variants,
  children,
}: {
  variants: StorefrontVariant[];
  children: ReactNode;
}) {
  const initialId = useMemo(
    () =>
      ([...variants]
        .filter((variant) => variant.price !== undefined)
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0] ??
        variants[0])?.id ?? null,
    [variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(initialId);
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  const value = useMemo(
    () => ({ selectedVariantId, selectedVariant, setSelectedVariantId }),
    [selectedVariantId, selectedVariant],
  );

  return <SelectedVariantContext.Provider value={value}>{children}</SelectedVariantContext.Provider>;
}

export function useSelectedVariant(): SelectedVariantValue {
  const context = useContext(SelectedVariantContext);
  if (!context) throw new Error("useSelectedVariant must be used within SelectedVariantProvider");
  return context;
}
