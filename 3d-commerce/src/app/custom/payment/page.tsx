"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconArrowLeft, IconCheck, IconLock, IconMapPin, IconShieldCheck } from "@tabler/icons-react";

import { Navbar } from "@/components/layout/SiteNavbar";
import { SavedAddressSelector } from "@/components/checkout/SavedAddressSelector";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useAddresses, type Address } from "@/context/AddressContext";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/payment-api";

type CustomRequest = {
  id: string;
  title: string;
  category: string | null;
  bodyType: string | null;
  headType: string | null;
  subjectType: string | null;
  personCount: number | null;
  petCount: number | null;
  sizeCm: number | null;
  priceMinor: number | null;
  priceCurrency: string | null;
  referenceFileCount: number;
  status: string;
};

export default function CustomPaymentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("request");
  const { addresses, defaultAddressId, isLoaded } = useAddresses();

  const [request, setRequest] = useState<CustomRequest | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddressId);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  useEffect(() => {
    if (!requestId) {
      router.replace("/custom");
      return;
    }

    let cancelled = false;
    void fetch(`/api/custom-requests/${encodeURIComponent(requestId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? data?.message ?? "Unable to load custom request.");
        }
        return data as CustomRequest;
      })
      .then((data) => {
        if (!cancelled) {
          setRequest(data);
          if (!selectedAddressId && defaultAddressId) setSelectedAddressId(defaultAddressId);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load custom request.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, router, defaultAddressId, selectedAddressId]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const amountMinor = request?.priceMinor ?? 0;
  const currency = request?.priceCurrency ?? "INR";

  const handlePay = async () => {
    if (!request || !selectedAddressId || !checkoutReady || amountMinor <= 0) return;

    setProcessing(true);
    setError(null);

    try {
      const checkout = await fetch(
        `/api/custom-requests/${encodeURIComponent(request.id)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shippingAddressId: selectedAddressId,
            idempotencyKey: window.crypto.randomUUID(),
          }),
          cache: "no-store",
        },
      );

      const checkoutBody = (await checkout.json().catch(() => null)) as
        | { order?: { id: string; totalMinor: number; currency: string }; message?: string | string[]; error?: string }
        | null;

      if (!checkout.ok || !checkoutBody?.order?.id) {
        throw new Error(
          Array.isArray(checkoutBody?.message)
            ? checkoutBody.message[0]
            : checkoutBody?.message ?? checkoutBody?.error ?? "Unable to prepare custom order.",
        );
      }

      const order = checkoutBody.order;
      if (order.totalMinor !== amountMinor || order.currency !== currency) {
        throw new Error("The custom price changed. Please return to the custom builder and refresh.");
      }

      const razorpayOrder = await createRazorpayOrder(order.id);

      if (razorpayOrder.amount !== order.totalMinor || razorpayOrder.currency !== order.currency) {
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

        const razorpay = new window.Razorpay({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "ADVFX",
          description: `Custom physical product ${razorpayOrder.orderNumber}`,
          order_id: razorpayOrder.razorpayOrderId,
          notes: { orderId: order.id, customRequestId: request.id },
          theme: { color: "#c9a86a" },
          modal: {
            ondismiss: () => {
              setError("Payment was not completed. Your custom build is still saved.");
              finish();
            },
          },
          handler: (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            void verifyRazorpayPayment({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
              .then(() => {
                router.push(`/order/confirmation?order=${encodeURIComponent(order.id)}`);
              })
              .catch((cause) => {
                setError(cause instanceof Error ? cause.message : "Payment verification failed.");
              })
              .finally(finish);
          },
        });

        razorpay.open();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start payment.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !isLoaded) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen">
          <Container>
            <div className="flex min-h-[70vh] items-center justify-center text-[10px] uppercase tracking-[0.18em] text-muted">
              Loading custom order…
            </div>
          </Container>
        </main>
      </>
    );
  }

  if (error && !request) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen">
          <Container>
            <div className="mx-auto max-w-xl py-24 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-error">Custom payment</p>
              <h1 className="mt-4 font-serif text-4xl">Unable to continue</h1>
              <p className="mt-3 text-sm text-muted">{error}</p>
              <Button href="/custom" size="lg" className="mt-7">Back to custom</Button>
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
        <section className="pb-20 pt-28 sm:pb-24 sm:pt-32">
          <Container>
            <div className="mb-8">
              <Link href="/custom" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted hover:text-foreground">
                <IconArrowLeft size={14} /> Back to custom
              </Link>
              <p className="mt-7 text-[9px] font-medium uppercase tracking-[0.22em] text-primary">Custom physical order</p>
              <h1 className="mt-3 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">Complete your custom order.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Your configuration and server-calculated price are locked into this payment step.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-white/[0.1] bg-white/[0.02] p-5 sm:p-7">
                  <div className="flex items-center gap-3">
                    <IconMapPin size={18} className="text-primary" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-primary">01</p>
                      <h2 className="mt-1 text-xl font-medium">Delivery address</h2>
                    </div>
                  </div>
                  <div className="mt-5">
                    <SavedAddressSelector
                      value={selectedAddressId}
                      onChange={(address: Address | null) => setSelectedAddressId(address?.id ?? null)}
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-white/[0.1] bg-white/[0.02] p-5 sm:p-7">
                  <div className="flex items-center gap-3">
                    <IconShieldCheck size={18} className="text-primary" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-primary">02</p>
                      <h2 className="mt-1 text-xl font-medium">Secure payment</h2>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/[0.06] p-5">
                    <p className="text-sm font-medium">Razorpay</p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      Payment is verified by the server before your custom order is confirmed.
                    </p>
                  </div>
                  {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3 text-[10px] text-red-300">{error}</p> : null}
                </section>
              </div>

              <aside className="h-fit rounded-3xl border border-white/[0.1] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] lg:sticky lg:top-24">
                <p className="text-[9px] uppercase tracking-[0.18em] text-primary">Order summary</p>
                <h2 className="mt-2 font-serif text-2xl">{request?.title ?? "Custom product"}</h2>

                <div className="mt-5 space-y-3 border-b border-white/[0.07] pb-5 text-xs">
                  <Row label="Category" value={request?.category ?? "Custom"} />
                  {request?.bodyType ? <Row label="Body" value={request.bodyType} /> : null}
                  {request?.headType ? <Row label="Head" value={request.headType} /> : null}
                  {request?.subjectType ? <Row label="Subject" value={request.subjectType} /> : null}
                  {request?.personCount ? <Row label="People" value={String(request.personCount)} /> : null}
                  {request?.petCount ? <Row label="Pets" value={String(request.petCount)} /> : null}
                  <Row label="Size" value={request?.sizeCm ? `${request.sizeCm} cm` : "—"} />
                  <Row label="References" value={String(request?.referenceFileCount ?? 0)} />
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Total</p>
                    <p className="mt-1 text-3xl font-semibold">₹{(amountMinor / 100).toLocaleString("en-IN")}</p>
                  </div>
                  <span className="text-[9px] text-muted">Manufacturing order</span>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={!selectedAddressId || processing || !checkoutReady || !request || amountMinor <= 0}
                  onClick={() => void handlePay()}
                  className="mt-6 w-full"
                >
                  {processing ? "Preparing payment…" : !checkoutReady ? "Loading payment…" : `Pay ₹${(amountMinor / 100).toLocaleString("en-IN")}`}
                </Button>

                <p className="mt-3 text-center text-[9px] leading-4 text-muted">
                  Your custom request enters the manufacturing workflow after successful payment verification.
                </p>
              </aside>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
