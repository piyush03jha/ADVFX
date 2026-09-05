"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconShieldCheck,
  IconCreditCard,
  IconBuildingBank,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCart } from "@/context/CartContext";
import { getCountry, type CountryCode } from "@/config/countries";
import { calculateCartPricing, formatMoney } from "@/lib/pricing";

const DRAFT_KEY = "forma-checkout-draft";

export default function PaymentPage() {
  const router = useRouter();
  const { items, isLoaded, clearCart } = useCart();
  const [country, setCountry] = useState<CountryCode>("IN");
  const [method, setMethod] = useState<"card" | "upi" | "netbanking">("card");
  const [processing, setProcessing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { country?: CountryCode };
        if (draft.country) setCountry(draft.country);
      }
    } catch {
      // Fall back to India.
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  const pricing = useMemo(
    () => calculateCartPricing(items, country),
    [items, country],
  );
  const countryConfig = getCountry(country);
  const shippingMinor = pricing.subtotal.amountMinor >= 499900 ? 0 : 19900;
  const total = {
    amountMinor: pricing.subtotal.amountMinor + shippingMinor,
    currency: pricing.currency,
  };

  const handlePay = () => {
    if (pricing.unavailableProductIds.length > 0 || items.length === 0) return;

    setProcessing(true);

    const orderId = `ORD-${Date.now().toString().slice(-8)}`;
    const order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      paymentStatus: "pending",
      fulfillmentStatus: "pending",
      country,
      currency: pricing.currency,
      total,
    };

    window.localStorage.setItem("forma-last-order", JSON.stringify(order));

    window.setTimeout(() => {
      clearCart();
      router.push(`/order/confirmation?order=${orderId}`);
    }, 700);
  };

  if (!isLoaded || !draftLoaded) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen">
          <Container>
            <div className="flex min-h-[70vh] items-center justify-center text-[10px] uppercase tracking-[0.18em] text-muted">
              Loading secure payment…
            </div>
          </Container>
        </main>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen">
          <Container>
            <div className="mx-auto max-w-xl py-24 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Payment</p>
              <h1 className="mt-4 font-serif text-4xl text-foreground">Your cart is empty</h1>
              <Button href="/shop" size="lg" className="mt-7">
                Return to shop
              </Button>
            </div>
          </Container>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden">
        <section className="relative pb-20 pt-4 sm:pb-24 sm:pt-7 lg:pb-28 lg:pt-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/[0.045] blur-[150px]"
          />

          <Container>
            <div className="mb-8 sm:mb-10">
              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-foreground"
              >
                <IconArrowLeft size={14} />
                Back to delivery
              </Link>

              <div className="mt-7 flex items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-px w-7 bg-primary" />
                    <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-primary">
                      Payment
                    </p>
                  </div>

                  <h1 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
                    Secure your order
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                    Review the final amount and choose how you'd like to pay.
                  </p>
                </div>

                <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted sm:flex">
                  <IconLock size={14} className="text-primary" />
                  Encrypted checkout
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
              <div className="space-y-7">
                {/* ================================================
                    PAYMENT METHOD
                ================================================= */}

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-primary">01</p>
                      <h2 className="mt-2 text-xl font-medium text-foreground">Payment method</h2>
                    </div>
                    <span className="text-[10px] text-muted">{countryConfig.currency}</span>
                  </div>

                  <div className="mt-6 space-y-2">
                    <PaymentOption
                      active={method === "card"}
                      onClick={() => setMethod("card")}
                      icon={<IconCreditCard size={18} />}
                      title="Credit or debit card"
                      description="Visa, Mastercard, American Express"
                    />
                    <PaymentOption
                      active={method === "upi"}
                      onClick={() => setMethod("upi")}
                      icon={<IconShieldCheck size={18} />}
                      title="UPI"
                      description="Pay securely using your UPI app"
                    />
                    <PaymentOption
                      active={method === "netbanking"}
                      onClick={() => setMethod("netbanking")}
                      icon={<IconBuildingBank size={18} />}
                      title="Net banking"
                      description="Use your bank's secure checkout"
                    />
                  </div>

                  {method === "card" ? (
                    <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/10 p-4 sm:p-5">
                      <div className="grid gap-4">
                        <FakeInput label="Card number" placeholder="1234  5678  9012  3456" />
                        <div className="grid grid-cols-2 gap-4">
                          <FakeInput label="Expiry date" placeholder="MM / YY" />
                          <FakeInput label="Security code" placeholder="CVC" />
                        </div>
                        <FakeInput label="Name on card" placeholder="Full name" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/10 p-5">
                      <p className="text-xs font-medium text-foreground">You'll be redirected securely</p>
                      <p className="mt-1.5 text-[11px] leading-5 text-muted">
                        Your selected payment provider will handle authentication. Your payment
                        credentials are never stored by this storefront.
                      </p>
                    </div>
                  )}
                </section>

                {/* ================================================
                    PAYMENT SECURITY
                ================================================= */}

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-5 sm:p-7">
                  <div className="flex gap-4">
                    <span className="pt-0.5 font-mono text-[10px] tracking-[0.15em] text-primary">02</span>
                    <div>
                      <h2 className="text-xl font-medium text-foreground">Payment security</h2>
                      <p className="mt-1.5 text-xs leading-5 text-muted">
                        We use secure payment processing and never store your full card details.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <TrustItem icon={<IconLock size={16} />} title="Secure" text="Encrypted" />
                    <TrustItem icon={<IconShieldCheck size={16} />} title="Protected" text="Verified" />
                    <TrustItem icon={<IconCheck size={16} />} title="Transparent" text="No hidden fees" />
                  </div>
                </section>
              </div>

              {/* ================================================
                  ORDER SUMMARY
              ================================================= */}

              <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:sticky lg:top-24">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Order summary</p>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <h2 className="font-serif text-2xl tracking-[-0.035em] text-foreground">Your order</h2>
                  <span className="text-xs text-muted">
                    {items.reduce((n, item) => n + item.quantity, 0)} items
                  </span>
                </div>

                <div className="mt-5 space-y-4 border-b border-white/[0.07] pb-5">
                  {items.map((item) => (
                    <div key={item.key} className="flex min-w-0 gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0b0b0c]">
                        <Image
                          src={item.product.image.startsWith("/") ? item.product.image : `/${item.product.image}`}
                          alt={item.product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                        <span className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{item.product.name}</p>
                        <p className="mt-1 text-[10px] text-muted">
                          {item.size.charAt(0).toUpperCase() + item.size.slice(1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {pricing.unavailableProductIds.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3 text-[10px] leading-4 text-red-300">
                    Some products are not priced for {countryConfig.name}. Return to checkout and choose
                    a configured country.
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  <SummaryRow label="Subtotal" value={formatMoney(pricing.subtotal)} />
                  <SummaryRow
                    label="Shipping"
                    value={
                      shippingMinor === 0
                        ? "FREE"
                        : formatMoney({ amountMinor: shippingMinor, currency: pricing.currency })
                    }
                    positive={shippingMinor === 0}
                  />
                </div>

                <div className="mt-5 flex items-end justify-between border-t border-white/[0.07] pt-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Total</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {formatMoney(total)}
                    </p>
                  </div>
                  <span className="text-right text-[9px] leading-4 text-muted">
                    {countryConfig.name}
                    <br />
                    {countryConfig.currency}
                  </span>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={processing || pricing.unavailableProductIds.length > 0}
                  onClick={handlePay}
                  className="mt-6 w-full"
                >
                  {processing ? (
                    "Preparing secure payment…"
                  ) : (
                    <>
                      <IconLock size={16} />
                      Pay {formatMoney(total)}
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-[9px] leading-4 text-muted">
                  By continuing, you agree to the order details and shipping information shown above.
                </p>
              </aside>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors sm:gap-4 ${
        active
          ? "border-primary/50 bg-primary/[0.055]"
          : "border-white/[0.07] bg-black/[0.06] hover:border-white/[0.14]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          active ? "border-primary/30 bg-primary/10 text-primary" : "border-white/[0.08] text-muted"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-[10px] text-muted">{description}</span>
      </span>
      <span
        className={`h-4 w-4 shrink-0 rounded-full border ${
          active ? "border-[5px] border-primary" : "border-white/20"
        }`}
      />
    </button>
  );
}

function FakeInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] uppercase tracking-[0.15em] text-muted">{label}</span>
      <input
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.015] px-4 text-sm text-foreground outline-none placeholder:text-muted/40 focus:border-primary/60"
      />
    </label>
  );
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/[0.06] p-4">
      <span className="text-primary">{icon}</span>
      <p className="mt-3 text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[10px] text-muted">{text}</p>
    </div>
  );
}

function SummaryRow({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className={positive ? "font-medium text-emerald-400" : "font-medium text-foreground"}>
        {value}
      </span>
    </div>
  );
}