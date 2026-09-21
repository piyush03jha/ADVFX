"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconShieldCheck,
} from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCart, type CartItem } from "@/context/CartContext";
import {
  createOrder,
  formatQuoteMoney,
  getCheckoutQuote,
  type CheckoutQuote,
  type CheckoutSelectionItem,
} from "@/lib/checkout-api";
import {
  cancelRazorpayPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  type RazorpayOrder,
} from "@/lib/payment-api";
import { getCountry, type CountryCode } from "@/config/countries";

const DRAFT_KEY = "forma-checkout-draft";

export default function PaymentPage() {
  const router = useRouter();
  const { items: cartItems } = useCart();
  const [country, setCountry] = useState<CountryCode>("IN");
  const [processing, setProcessing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draft, setDraft] = useState<{
    addressId?: string;
    country?: CountryCode;
    couponCode?: string;
    email?: string;
    phone?: string;
    checkoutItems?: CheckoutSelectionItem[];
    checkoutDisplayItems?: CartItem[];
  } | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const displayItems = draft?.checkoutDisplayItems ?? cartItems;
  const selectedItems = useMemo(
    () => draft?.checkoutItems,
    [draft?.checkoutItems],
  );
  const backToCheckoutHref = selectedItems?.length
    ? "/checkout?mode=buy-now"
    : "/checkout";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          addressId?: string;
          country?: CountryCode;
          couponCode?: string;
          email?: string;
          phone?: string;
          checkoutItems?: CheckoutSelectionItem[];
          checkoutDisplayItems?: CartItem[];
        };
        setDraft(saved);
        if (saved.country) setCountry(saved.country);
      }
    } catch {
      // Keep the defaults.
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draft?.addressId) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteError(null);

    void getCheckoutQuote(
      draft.addressId,
      draft.couponCode,
      selectedItems,
    )
      .then((value) => {
        if (!cancelled) setQuote(value);
      })
      .catch((cause) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(
            cause instanceof Error
              ? cause.message
              : "Unable to calculate the final order total.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [draft?.addressId, draft?.couponCode, selectedItems]);

  const countryConfig = getCountry(country);
  const total = quote
    ? { amountMinor: quote.summary.totalMinor, currency: quote.currency }
    : null;

  const handlePay = async () => {
    if (
      !draft?.addressId ||
      !quote ||
      quote.summary.totalMinor <= 0 ||
      displayItems.length === 0
    ) {
      return;
    }

    if (!window.Razorpay) {
      setQuoteError("Secure payment checkout is still loading. Please try again.");
      return;
    }

    setProcessing(true);
    setQuoteError(null);

    try {
      const order = await createOrder({
        shippingAddressId: draft.addressId,
        couponCode: draft.couponCode,
        idempotencyKey: window.crypto.randomUUID(),
        quotedSubtotalMinor: quote.summary.subtotalMinor,
        quotedShippingMinor: quote.summary.shippingMinor,
        quotedDiscountMinor: quote.summary.discountMinor,
        quotedTaxMinor: quote.summary.taxMinor,
        quotedTotalMinor: quote.summary.totalMinor,
        quotedCurrency: quote.currency,
        items: selectedItems,
      });

      const razorpayOrder: RazorpayOrder = await createRazorpayOrder(order.id);

      if (
        razorpayOrder.amount !== order.totalMinor ||
        razorpayOrder.currency !== order.currency
      ) {
        throw new Error("Payment amount could not be verified.");
      }

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        const checkout = new window.Razorpay({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "ADVFX",
          description: "Physical product order " + razorpayOrder.orderNumber,
          order_id: razorpayOrder.razorpayOrderId,
          notes: { orderId: order.id },
          theme: { color: "#c9a86a" },
          modal: {
            ondismiss: () => {
              void cancelRazorpayPayment(order.id)
                .then((result) => {
                  setQuoteError(
                    result.refunded
                      ? "Payment was cancelled and refunded."
                      : "Payment was cancelled. Your items are available for checkout again.",
                  );
                })
                .catch(() => {
                  setQuoteError(
                    "Payment was cancelled. We are reconciling the payment status in the background.",
                  );
                })
                .finally(() => {
                  try {
                    window.localStorage.removeItem(DRAFT_KEY);
                    window.localStorage.removeItem("forma-buy-now");
                  } catch {
                    // Ignore local storage cleanup failures.
                  }
                  finish();
                });
            },
          },
          handler: (response) => {
            void verifyRazorpayPayment({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
              .then((result) => {
                if (result.orderStatus !== "CONFIRMED") {
                  setQuoteError(
                    "Payment was received but the order is not yet confirmed. We are reconciling it now; please check My Orders shortly.",
                  );
                  finish();
                  return;
                }

                try {
                  window.localStorage.removeItem(DRAFT_KEY);
                  window.localStorage.removeItem("forma-buy-now");
                } catch {
                  // Ignore storage failures after a successful payment.
                }

                finish();
                router.push(
                  "/order/confirmation?order=" + encodeURIComponent(order.id),
                );
              })
              .catch((cause) => {
                setQuoteError(
                  cause instanceof Error
                    ? cause.message
                    : "Payment verification failed. Your order remains pending.",
                );
                finish();
              });
          },
        });

        checkout.on("payment.failed", (response: unknown) => {
          const failure = response as {
            error?: { description?: string; reason?: string };
          };
          setQuoteError(
            failure.error?.description ||
              "Payment failed. Your items are still available for checkout.",
          );
          finish();
        });

        checkout.open();
      });
    } catch (cause) {
      setQuoteError(
        cause instanceof Error ? cause.message : "Unable to start secure payment.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!draftLoaded || (draft?.addressId && !quote && !quoteError)) {
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

  if (displayItems.length === 0) {
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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
      />
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
                href={backToCheckoutHref}
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
                    Complete payment securely with Razorpay.
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
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-primary">01</p>
                      <h2 className="mt-2 text-xl font-medium text-foreground">Razorpay</h2>
                    </div>
                    <span className="text-[10px] text-muted">{countryConfig.currency}</span>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/[0.07] bg-black/[0.06] p-5">
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <IconShieldCheck size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Secure payment gateway
                        </p>
                        <p className="mt-1.5 text-xs leading-5 text-muted">
                          Razorpay will securely handle card, UPI, net banking and other
                          available payment methods. Payment details are not stored by ADVFX.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-5 sm:p-7">
                  <div className="flex gap-4">
                    <span className="pt-0.5 font-mono text-[10px] tracking-[0.15em] text-primary">02</span>
                    <div>
                      <h2 className="text-xl font-medium text-foreground">Payment security</h2>
                      <p className="mt-1.5 text-xs leading-5 text-muted">
                        Payment confirmation is verified by our server before the order is confirmed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <TrustItem icon={<IconLock size={16} />} title="Secure" text="Razorpay Checkout" />
                    <TrustItem icon={<IconShieldCheck size={16} />} title="Protected" text="Server verified" />
                    <TrustItem icon={<IconCheck size={16} />} title="Transparent" text="Final total from server" />
                  </div>
                </section>
              </div>

              <aside className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6 lg:sticky lg:top-24">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">Order summary</p>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <h2 className="font-serif text-2xl tracking-[-0.035em] text-foreground">Your order</h2>
                  <span className="text-xs text-muted">
                    {displayItems.reduce((n, item) => n + item.quantity, 0)} items
                  </span>
                </div>

            <div className="mt-5 space-y-4 border-b border-white/[0.07] pb-5">
                  {displayItems.map((item) => (
                    <div key={item.key} className="flex min-w-0 gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0b0b0c]">
                        <Image
                          src={item.product.image.startsWith("/") ? item.product.image : "/" + item.product.image}
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
                        <p className="mt-1 text-[10px] text-muted">{
                          item.variantName ?? item.variantSize ?? item.size
                        }</p>
                      </div>
                    </div>
                  ))}
                </div>

                {quoteError ? (
                  <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3 text-[10px] leading-4 text-red-300">
                    {quoteError}
                  </div>
                ) : null}

                {quote ? (
                  <div className="mt-5 space-y-3">
                    <SummaryRow label="Subtotal" value={formatQuoteMoney(quote.summary.subtotalMinor, quote.currency)} />
                    <SummaryRow
                      label="Shipping"
                      value={quote.summary.shippingMinor === 0 ? "FREE" : formatQuoteMoney(quote.summary.shippingMinor, quote.currency)}
                      positive={quote.summary.shippingMinor === 0}
                    />
                    {quote.summary.discountMinor > 0 ? (
                      <SummaryRow label="Discount" value={"-" + formatQuoteMoney(quote.summary.discountMinor, quote.currency)} positive />
                    ) : null}
                    {quote.summary.taxMinor > 0 ? (
                      <SummaryRow label="Tax" value={formatQuoteMoney(quote.summary.taxMinor, quote.currency)} />
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex items-end justify-between border-t border-white/[0.07] pt-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Total</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {total ? formatQuoteMoney(total.amountMinor, total.currency) : "—"}
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
                  disabled={
                    processing ||
                    !quote ||
                    quote.summary.totalMinor <= 0 ||
                    !checkoutReady
                  }
                  onClick={() => void handlePay()}
                  className="mt-6 w-full"
                >
                  {processing
                    ? "Opening secure checkout…"
                    : !checkoutReady
                      ? "Loading secure checkout…"
                      : "Pay " + (total ? formatQuoteMoney(total.amountMinor, total.currency) : "")}
                </Button>

                <p className="mt-3 text-center text-[9px] leading-4 text-muted">
                  Your order is confirmed only after successful server-side payment verification.
                </p>
              </aside>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/[0.06] p-4">
      <span className="text-primary">{icon}</span>
      <p className="mt-3 text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[10px] text-muted">{text}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className={positive ? "font-medium text-emerald-400" : "font-medium text-foreground"}>
        {value}
      </span>
    </div>
  );
}
