"use client";

import { useState } from "react";

import { IconLock, IconShoppingBag } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/context/CartContext";
import type { CountryCode } from "@/config/countries";

export default function CheckoutPage() {
  const { items, isLoaded } = useCart();
  const [country, setCountry] = useState<CountryCode>("IN");

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden">
        <section className="relative pb-20 pt-4 sm:pb-24 sm:pt-6 lg:pb-28 lg:pt-8">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[140px]" />
          <Container>
            <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-px w-7 bg-primary" />
                  <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-primary">Secure checkout</p>
                </div>
                <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">Complete your order</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Enter your delivery details and review your order before payment.</p>
              </div>
              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted sm:flex">
                <IconLock size={14} className="text-primary" />
                Secure checkout
              </div>
            </div>

            {!isLoaded ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.015]">
                <div className="text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border border-white/10 border-t-primary" />
                  <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-muted">Loading checkout</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyCheckout />
            ) : (
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
                <CheckoutForm onCountryChange={setCountry} />
                <CheckoutSummary country={country} />
              </div>
            )}
          </Container>
        </section>
      </main>
    </>
  );
}

function EmptyCheckout() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.015] px-6 py-14 text-center sm:px-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.06] text-primary">
        <IconShoppingBag size={22} />
      </div>
      <h2 className="mt-5 font-serif text-3xl tracking-[-0.04em] text-foreground">Your cart is empty</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Add a model to your cart before continuing to checkout.</p>
      <Button href="/shop" size="lg" className="mt-7">
        Explore models
      </Button>
    </div>
  );
}