import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconMapPin,
  IconPackage,
  IconTruck,
} from "@tabler/icons-react";

import { OrderItems } from "@/components/account/OrderItems";
import { OrderSummary } from "@/components/account/OrderSummary";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getOrderById, getOrderStatusLabel } from "@/config/orders";
import { Button } from "@/components/ui/Button";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function OrderTrackingPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = getOrderById(id);

  if (!order) {
    notFound();
  }

  const shipment = order.shipment;
  const currentEvent = shipment?.events.find((event) => event.current);

  return (
    <>
      <Navbar />

      <main className="min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute right-[5%] top-[42%] h-96 w-96 rounded-full bg-primary/[0.045] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-36">
          <div className="mb-7 flex items-center justify-between gap-4 sm:mb-9">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted transition-colors hover:text-foreground sm:text-xs"
            >
              <IconArrowLeft size={14} />
              All orders
            </Link>

            <span className="rounded-full border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--primary)/0.06))] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-primary">
              {getOrderStatusLabel(order.status)}
            </span>
          </div>

          <header className="max-w-3xl">
            <p className="text-[9px] uppercase tracking-[0.24em] text-primary">
              FORMA / ORDER TRACKING
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-5xl">
              Track your order.
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted sm:text-sm">
              <span>{order.orderNumber}</span>
              <span className="h-1 w-1 rounded-full bg-muted/50" />
              <span>Placed {formatDate(order.createdAt)}</span>
            </div>
          </header>

          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)] lg:gap-6">
            <div className="space-y-5">
              <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.07),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.09))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:p-7">
                <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/[0.09] blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <IconTruck size={17} />
                      <p className="text-[9px] font-medium uppercase tracking-[0.16em]">
                        Shipment status
                      </p>
                    </div>
                    <h2 className="mt-2 text-xl font-medium text-foreground sm:text-2xl">
                      {currentEvent?.title ?? getOrderStatusLabel(order.status)}
                    </h2>
                    <p className="mt-1 max-w-lg text-xs leading-5 text-muted sm:text-sm">
                      {currentEvent?.description ?? "Your order is moving through our fulfillment process."}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_30px_var(--glow-primary)]">
                    <IconPackage size={20} />
                  </div>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] p-3.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Carrier</p>
                    <p className="mt-1 text-xs font-medium text-foreground">{shipment?.carrier ?? "Preparing"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] p-3.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Tracking number</p>
                    <p className="mt-1 truncate text-xs font-medium text-foreground">{shipment?.trackingNumber ?? "Assigned after shipping"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] p-3.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Estimated delivery</p>
                    <p className="mt-1 text-xs font-medium text-foreground">{shipment?.estimatedDelivery ?? "We'll update you"}</p>
                  </div>
                </div>

                {shipment?.trackingNumber && (
                  <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--primary)/0.055),hsl(var(--background)/0.02))] px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <IconCopy size={14} className="shrink-0 text-muted" />
                      <span className="truncate text-[10px] text-muted">{shipment.trackingNumber}</span>
                    </div>
                    {shipment.trackingUrl ? (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-primary"
                      >
                        Carrier tracking
                        <IconChevronRight size={12} />
                      </a>
                    ) : (
                      <span className="shrink-0 text-[10px] text-muted">Tracking active</span>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.065))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:p-7">
                <div className="mb-6">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Delivery journey</p>
                  <h2 className="mt-1 text-lg font-medium text-foreground sm:text-xl">Order progress</h2>
                </div>

                {shipment?.events.length ? (
                  <OrderTimeline events={shipment.events} />
                ) : (
                  <div className="rounded-2xl border border-white/[0.08] bg-background/20 p-5 text-sm text-muted">
                    Tracking updates will appear here once your shipment is created.
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.055),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.06))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.1)] sm:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <IconPackage size={15} className="text-primary" />
                  <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-foreground">Your items</h2>
                </div>
                <OrderItems items={order.items} />
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.07),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.08))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.14)] sm:p-6">
                <div className="flex items-center gap-2">
                  <IconMapPin size={15} className="text-primary" />
                  <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-foreground">Delivering to</h2>
                </div>
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.04),hsl(var(--background)/0.015))] p-4 text-xs leading-5">
                  <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                  <p className="mt-1 text-muted">{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p className="text-muted">{order.shippingAddress.addressLine2}</p>}
                  <p className="text-muted">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="text-muted">{order.shippingAddress.country}</p>
                </div>
              </section>

              <OrderSummary order={order} />

              <div className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--background)/0.02)_60%,hsl(var(--foreground)/0.045))] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IconCheck size={17} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">We'll keep you updated</p>
                    <p className="mt-1 text-[10px] leading-5 text-muted">
                      Your order status will move through each production and delivery milestone here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button href="/account/orders" size="md">Back to orders</Button>
                <Button href="/shop" variant="outline" size="md">Continue shopping</Button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
