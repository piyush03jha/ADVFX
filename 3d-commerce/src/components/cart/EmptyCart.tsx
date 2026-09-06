"use client";

import { IconShoppingBag } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";

export function EmptyCart() {
  return (
    <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.1] bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.1),transparent_34%),linear-gradient(135deg,hsl(var(--foreground)/0.055),hsl(var(--background)/0.018)_58%,hsl(var(--primary)/0.075))] px-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-[linear-gradient(145deg,hsl(var(--foreground)/0.08),hsl(var(--background)/0.02))] text-primary">
        <IconShoppingBag size={26} stroke={1.4} />
      </div>
      <p className="relative mt-6 text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Your collection</p>
      <h2 className="relative mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground">Your cart is empty</h2>
      <p className="relative mt-3 max-w-md text-sm leading-6 text-muted">Discover premium models and add something worth bringing home.</p>
      <Button href="/shop" size="lg" className="relative mt-7">Continue Shopping</Button>
    </div>
  );
}
