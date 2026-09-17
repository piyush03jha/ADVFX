"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { IconLock, IconShoppingBag } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import type { CountryCode } from "@/config/countries";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { items, isLoaded } = useCart();
  const [country, setCountry] = useState<CountryCode>("IN");

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent("/checkout")}`);
    }
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen overflow-hidden bg-background">
          <section className="relative flex min-h-[calc(100svh-76px)] items-center justify-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-16 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[140px]" />
            <div className="relative rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_56%,hsl(var(--primary)/0.07))] px-8 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border border-white/10 border-t-primary" />
              <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-muted">Checking your account</p>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden">
        <section className="relative pb-20 pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-36">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[140px]" />
          <Container>
            <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
              <div>
                <h1 className="font-serif text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">Complete your order</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Enter your delivery details and review your order before payment.</p>
              </div>
              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted sm:flex">
                <IconLock size={14} className="text-primary" />
                Secure checkout
              </div>
            </div>

            {!isLoaded ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.05),hsl(var(--background)/0.02)_60%,hsl(var(--primary)/0.06))] shadow-[0_20px_65px_rgba(0,0,0,0.14)]">
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
                <CheckoutSummary country={country} customerName={user?.name} customerEmail={user?.email} />
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
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_58%,hsl(var(--primary)/0.07))] px-6 py-14 text-center shadow-[0_22px_70px_rgba(0,0,0,0.16)] sm:px-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.07] text-primary">
        <IconShoppingBag size={22} />
      </div>
      <h2 className="mt-5 font-serif text-3xl tracking-[-0.04em] text-foreground">Your cart is empty</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Add a model to your cart before continuing to checkout.</p>
      <Button href="/shop" size="lg" className="mt-7">Explore models</Button>
    </div>
  );
}
