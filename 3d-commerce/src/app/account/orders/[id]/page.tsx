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

  if (!order) notFound();

  const shipment = order.shipment;
  const currentEvent = shipment?.events.find((event) => event.current);

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-[8%] top-20 h-64 w-64 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute right-[5%] top-[38%] h-80 w-80 rounded-full bg-primary/[0.045] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-7xl flex-col px-4 pb-5 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:px-8 lg:pt-24">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted hover:text-foreground sm:text-xs">
              <IconArrowLeft size={14} /> All orders
            </Link>
            <span className="rounded-full border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--primary)/0.06))] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-primary">
              {getOrderStatusLabel(order.status)}
            </span>
          </div>

          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.24em] text-primary">FORMA / ORDER TRACKING</p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-4xl">Track your order.</h1>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted sm:text-xs">
              <span>{order.orderNumber}</span>
              <span className="h-1 w-1 rounded-full bg-muted/50" />
              <span>Placed {formatDate(order.createdAt)}</span>
            </div>
          </header>

          <div className="grid flex-1 gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)] lg:gap-5">
            <div className="grid min-h-0 gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.07),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.09))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.14)] sm:p-5">
                <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/[0.09] blur-3xl" />
                <div className="relative grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <IconTruck size={15} />
                      <p className="text-[8px] font-medium uppercase tracking-[0.16em]">Shipment status</p>
                    </div>
                    <h2 className="mt-1 text-lg font-medium text-foreground sm:text-xl">{currentEvent?.title ?? getOrderStatusLabel(order.status)}</h2>
                    <p className="mt-0.5 max-w-xl text-[10px] leading-4 text-muted sm:text-xs">{currentEvent?.description ?? "Your order is moving through our fulfillment process."}</p>
                  </div>
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_var(--glow-primary)] sm:flex">
                    <IconPackage size={18} />
                  </div>
                </div>

                <div className="relative mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] px-3 py-2.5">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Carrier</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-foreground">{shipment?.carrier ?? "Preparing"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] px-3 py-2.5">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Tracking</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-foreground">{shipment?.trackingNumber ?? "Pending"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.02))] px-3 py-2.5">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-muted">Delivery</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-foreground">{shipment?.estimatedDelivery ?? "We'll update you"}</p>
                  </div>
                </div>

                {shipment?.trackingNumber && (
                  <div className="relative mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--primary)/0.055),hsl(var(--background)/0.02))] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2"><IconCopy size={13} className="shrink-0 text-muted" /><span className="truncate text-[9px] text-muted">{shipment.trackingNumber}</span></div>
                    {shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-[9px] font-medium text-primary">Carrier tracking <IconChevronRight size={11} /></a> : <span className="shrink-0 text-[9px] text-muted">Tracking active</span>}
                  </div>
                )}
              </section>

              <section className="min-h-0 overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.06),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.065))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.11)] sm:p-5">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.16em] text-primary">Delivery journey</p>
                    <h2 className="mt-0.5 text-base font-medium text-foreground sm:text-lg">Order progress</h2>
                  </div>
                  <span className="text-[9px] text-muted">{shipment?.events.filter((event) => event.completed).length ?? 0}/{shipment?.events.length ?? 0} completed</span>
                </div>
                {shipment?.events.length ? (
                  <div className="max-h-[calc(100svh-390px)] overflow-y-auto pr-1 sm:max-h-[calc(100svh-360px)] lg:max-h-none lg:overflow-visible">
                    <OrderTimeline events={shipment.events} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-background/20 p-4 text-xs text-muted">Tracking updates will appear here once your shipment is created.</div>
                )}
              </section>
            </div>

            <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100svh-120px)] lg:overflow-auto">
              <section className="rounded-2xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.07),hsl(var(--background)/0.02)_52%,hsl(var(--primary)/0.08))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:p-5">
                <div className="flex items-center gap-2"><IconMapPin size={14} className="text-primary" /><h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-foreground">Delivering to</h2></div>
                <div className="mt-3 rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.04),hsl(var(--background)/0.015))] p-3 text-[10px] leading-4">
                  <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                  <p className="mt-0.5 text-muted">{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p className="text-muted">{order.shippingAddress.addressLine2}</p>}
                  <p className="text-muted">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="text-muted">{order.shippingAddress.country}</p>
                </div>
              </section>

              <OrderSummary order={order} />

              <div className="rounded-2xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--background)/0.02)_60%,hsl(var(--foreground)/0.045))] p-4">
                <div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><IconCheck size={15} /></div><div><p className="text-[10px] font-medium text-foreground">We'll keep you updated</p><p className="mt-0.5 text-[9px] leading-4 text-muted">Your order status will move through each production and delivery milestone here.</p></div></div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"><Button href="/account/orders" size="md">Back to orders</Button><Button href="/shop" variant="outline" size="md">Continue shopping</Button></div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
