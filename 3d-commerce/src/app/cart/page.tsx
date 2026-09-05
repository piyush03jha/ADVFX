"use client";

import { IconArrowLeft, IconShoppingBag } from "@tabler/icons-react";
import Link from "next/link";

import { Navbar } from "@/components/layout/SiteNavbar";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, itemCount, isLoaded, clearCart } = useCart();

  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-hidden">
        <section className="relative pb-20 pt-4 sm:pb-24 sm:pt-6 lg:pb-28 lg:pt-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[130px]"
          />

          <Container>
            <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-7 bg-primary" />
                  <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-primary">
                    Your collection
                  </p>
                </div>

                <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
                  Shopping Cart
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Review your selected pieces before checkout.
                </p>
              </div>

              {isLoaded && items.length > 0 && (
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <IconShoppingBag size={15} className="text-primary" />
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-muted hover:text-red-400"
                  >
                    Clear cart
                  </Button>
                </div>
              )}
            </div>

            {!isLoaded ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.015]">
                <div className="text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border border-white/10 border-t-primary" />
                  <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-muted">
                    Loading cart
                  </p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyCart />
            ) : (
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12">
                <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.015] px-4 sm:px-6">
                  <div className="flex items-center justify-between border-b border-white/[0.07] py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted">
                      Selected items
                    </p>
                    <span className="text-[9px] text-muted">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {items.map((item) => (
                    <CartItem key={item.key} item={item} />
                  ))}

                  <div className="flex items-center justify-between gap-4 py-5">
                    <Link href="/shop" className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-primary">
                      <IconArrowLeft size={14} />
                      Continue shopping
                    </Link>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-muted hover:text-red-400 sm:hidden"
                    >
                      Clear cart
                    </Button>
                  </div>
                </section>

                <CartSummary />
              </div>
            )}
          </Container>
        </section>
      </main>
    </>
  );
}
