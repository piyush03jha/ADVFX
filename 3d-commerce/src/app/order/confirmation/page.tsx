"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IconCheck,
  IconChevronRight,
  IconMapPin,
  IconPackage,
} from "@tabler/icons-react";

import { getOrderStatus } from "@/lib/order-api";
import type { CreatedOrder } from "@/lib/checkout-api";
import { OrderItems } from "@/components/account/OrderItems";
import { OrderSummary } from "@/components/account/OrderSummary";


export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background text-xs text-muted">
          Loading order…
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    void getOrderStatus(orderId).then((value) => {
      if (!value.order) {
        setOrder(null);
        return;
      }
      setOrder(value.order as CreatedOrder);
    }).catch(() => setOrder(null)).finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <main className="min-h-screen bg-background flex items-center justify-center text-xs text-muted">Loading order…</main>;
  if (!order) return <main className="min-h-screen bg-background flex items-center justify-center text-xs text-muted">Order not found.</main>;

  const orderItems = order.items.map((item) => ({
    productId: item.productId,
    name: item.productName,
    image: "/catogeries/1.jpg",
    price: item.unitPriceMinor / 100,
    quantity: item.quantity,
  }));

  const orderSummary = {
    subtotal: order.subtotalMinor / 100,
    shipping: order.shippingMinor / 100,
    tax: order.taxMinor / 100,
    discount: order.discountMinor / 100,
    total: order.totalMinor / 100,
    paymentMethod: {
      label: order.payment?.provider ?? "Razorpay",
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <div
        className="
          mx-auto
          w-full
          max-w-4xl
          px-4
          py-8
          sm:px-6
          sm:py-12
        "
      >
        {/* Success */}
        <section className="text-center">
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              border
              border-primary/30
              bg-primary/10
              text-primary
              shadow-[0_0_35px_var(--glow-primary)]
            "
          >
            <IconCheck
              size={26}
              stroke={1.8}
            />
          </div>

          <p className="mt-5 text-[9px] uppercase tracking-[0.22em] text-primary">
            FORMA / ORDER STATUS
          </p>

          <h1
            className="
              mt-2
              text-2xl
              font-medium
              tracking-tight
              text-foreground
              sm:text-4xl
            "
          >
            {order.status === "CONFIRMED" ? "Your order is confirmed." : "Your order is being processed."}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted sm:text-sm">
            Thank you for your purchase. We'll keep
            you updated as your order moves toward
            delivery.
          </p>

          <p className="mt-3 text-xs font-medium text-foreground">
            {order.orderNumber}
          </p>
        </section>

        <div className="mt-8 space-y-4 sm:mt-10 sm:space-y-6">
          {/* Delivery */}
          <section
            className="
              rounded-2xl
              border
              border-border
              bg-surface/50
              p-4
              sm:p-5
            "
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconPackage size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted">
                  Estimated delivery
                </p>

                <p className="mt-1 text-sm font-medium text-foreground">
                  {order.shipment ? "Shipment details will appear here." : "Payment is pending; shipment updates will appear after confirmation."}
                </p>

                <p className="mt-1 text-[10px] text-muted">
                  We'll notify you when your order
                  ships.
                </p>
              </div>

              <Link
                href={`/account/orders/${order.id}`}
                className="
                  flex
                  shrink-0
                  items-center
                  gap-1
                  text-[10px]
                  font-medium
                  text-primary
                "
              >
                Track
                <IconChevronRight size={12} />
              </Link>
            </div>
          </section>

          {/* Items */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <IconPackage
                size={15}
                className="text-muted"
              />

              <h2 className="text-xs font-medium uppercase tracking-[0.12em]">
                Your order
              </h2>
            </div>

            <OrderItems items={orderItems} />
          </section>

          {/* Bottom */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section
              className="
                rounded-2xl
                border
                border-border
                bg-surface/50
                p-4
                sm:p-5
              "
            >
              <div className="flex items-center gap-2">
                <IconMapPin
                  size={15}
                  className="text-muted"
                />

                <h2 className="text-xs font-medium uppercase tracking-[0.12em]">
                  Delivering to
                </h2>
              </div>

              <div className="mt-3 text-xs leading-5">
                <p className="font-medium text-foreground">
                  {order.shippingAddress?.fullName}
                </p>

                <p className="text-muted">
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.state}
                </p>

                <p className="text-muted">
                  {order.shippingAddress?.country}
                </p>
              </div>
            </section>

            <OrderSummary order={orderSummary} />
          </div>

          {/* Actions */}
          <div
            className="
              grid
              gap-2
              sm:grid-cols-2
            "
          >
            <Link
              href={`/account/orders/${order.id}`}
              className="
                flex
                min-h-11
                items-center
                justify-center
                rounded-xl
                bg-primary
                px-4
                text-xs
                font-medium
                text-white
                shadow-[0_0_25px_var(--glow-primary)]
                transition-colors
                hover:bg-primary-hover
              "
            >
              Track order
            </Link>

            <Link
              href="/shop"
              className="
                flex
                min-h-11
                items-center
                justify-center
                rounded-xl
                border
                border-border
                px-4
                text-xs
                font-medium
                text-foreground
                transition-colors
                hover:bg-surface-elevated
              "
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}