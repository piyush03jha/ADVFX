"use client";

import { IconShoppingBag } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

export function EmptyCart() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-primary">
        <IconShoppingBag size={26} stroke={1.4} />
      </div>

      <p className="mt-6 text-[9px] font-medium uppercase tracking-[0.2em] text-primary">
        Your collection
      </p>

      <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground">
        Your cart is empty
      </h2>

      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Discover premium models and add something worth bringing home.
      </p>

      <Button href="/shop" size="lg" className="mt-7">
        Continue Shopping
      </Button>
    </div>
  );
}