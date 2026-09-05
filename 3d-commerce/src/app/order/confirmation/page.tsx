import Link from "next/link";
import {
  IconCheck,
  IconChevronRight,
  IconMapPin,
  IconPackage,
} from "@tabler/icons-react";

import { orders } from "@/config/orders";
import { OrderItems } from "@/components/account/OrderItems";
import { OrderSummary } from "@/components/account/OrderSummary";

export default function OrderConfirmationPage() {
  const order = orders[0];

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
            FORMA / ORDER CONFIRMED
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
            Your order is confirmed.
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
                  {order.shipment?.estimatedDelivery}
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

            <OrderItems items={order.items} />
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
                  {order.shippingAddress.name}
                </p>

                <p className="text-muted">
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.state}
                </p>

                <p className="text-muted">
                  {order.shippingAddress.country}
                </p>
              </div>
            </section>

            <OrderSummary order={order} />
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