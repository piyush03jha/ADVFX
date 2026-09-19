import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { IconArrowLeft, IconChevronRight, IconMapPin, IconPackage, IconTruck, IconCreditCard } from "@tabler/icons-react";
import { Navbar } from "@/components/layout/SiteNavbar";
import { OrderItems } from "@/components/account/OrderItems";
import { OrderSummary } from "@/components/account/OrderSummary";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { getBackendApiUrl } from "@/lib/backend-api";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

interface OrderPageProps { params: Promise<{ id: string }>; }

function label(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

async function getOrder(id: string) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const response = await fetch(getBackendApiUrl(`orders/${encodeURIComponent(id)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    currency: string;
    subtotalMinor: number;
    shippingMinor: number;
    taxMinor: number;
    discountMinor: number;
    totalMinor: number;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPriceMinor: number;
      totalPriceMinor: number;
    }>;
    shippingAddress: {
      fullName: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    payment: { provider: string; status: string } | null;
    shipment: {
      status: string;
      trackingNumber: string | null;
      trackingUrl: string | null;
    } | null;
  };
}

export default async function OrderTrackingPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const items = order.items.map((item) => ({
    productId: `${item.productId}-${item.id}`,
    name: item.productName,
    image: "/catogeries/1.jpg",
    price: item.unitPriceMinor / 100,
    quantity: item.quantity,
  }));

  const adaptedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status.toLowerCase() as any,
    items,
    subtotal: order.subtotalMinor / 100,
    shipping: order.shippingMinor / 100,
    tax: order.taxMinor / 100,
    discount: order.discountMinor / 100,
    total: order.totalMinor / 100,
    paymentMethod: {
      type: order.payment?.provider ?? "Payment",
      label: order.payment?.status ?? "Pending",
    },
    shippingAddress: {
      name: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      addressLine1: order.shippingAddress.line1,
      addressLine2: order.shippingAddress.line2 ?? undefined,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
  };

  const shipment = order.shipment;

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden bg-background">
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-7xl flex-col px-4 pb-5 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:px-8 lg:pt-24">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted hover:text-foreground sm:text-xs">
              <IconArrowLeft size={14} /> All orders
            </Link>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-primary">{label(order.status)}</span>
          </div>

          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.24em] text-primary">FORMA / ORDER TRACKING</p>
              <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-4xl">Track your order.</h1>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted sm:text-xs">
              <span>{order.orderNumber}</span>
              <span className="h-1 w-1 rounded-full bg-muted/50" />
              <span>Placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          </header>

          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)] lg:gap-5">
            <div className="grid min-h-0 gap-4">
              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><IconTruck size={18} /></div>
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.16em] text-primary">Shipment status</p>
                    <h2 className="mt-1 text-lg font-medium text-foreground">{shipment ? label(shipment.status) : label(order.status)}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {shipment?.trackingNumber ? `Tracking number: ${shipment.trackingNumber}` : "Shipment details will appear after fulfillment."}
                    </p>
                  </div>
                </div>
                {shipment?.trackingUrl && (
                  <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Track carrier <IconChevronRight size={13} />
                  </a>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2"><IconPackage size={15} className="text-primary" /><h2 className="text-xs font-medium uppercase tracking-[0.12em]">Order timeline</h2></div>
                <OrderTimeline
                  events={[
                    { status: "placed", title: "Order placed", description: "Your order has been received.", timestamp: new Date(order.createdAt).toLocaleString("en-IN"), completed: true },
                    { status: "confirmed", title: "Payment confirmed", description: "Payment confirmation for this order.", timestamp: order.payment?.status === "CAPTURED" ? "Confirmed" : "", completed: order.payment?.status === "CAPTURED", current: order.status === "CONFIRMED" },
                    { status: "processing", title: "Processing", description: "Your order is being prepared.", timestamp: "", completed: ["PROCESSING","READY_TO_SHIP","SHIPPED","DELIVERED"].includes(order.status), current: order.status === "PROCESSING" },
                    { status: "packed", title: "Ready to ship", description: "Your order is ready for shipment.", timestamp: "", completed: ["READY_TO_SHIP","SHIPPED","DELIVERED"].includes(order.status), current: order.status === "READY_TO_SHIP" },
                    { status: "shipped", title: "Shipped", description: "Your package has left our facility.", timestamp: shipment?.trackingNumber ? "Tracking available" : "", completed: ["SHIPPED","DELIVERED"].includes(order.status), current: order.status === "SHIPPED" },
                    { status: "in_transit", title: "In transit", description: "Your package is moving toward you.", timestamp: "", completed: shipment?.status === "IN_TRANSIT" || shipment?.status === "DELIVERED", current: shipment?.status === "IN_TRANSIT" },
                    { status: "delivered", title: "Delivered", description: "Your order has been delivered.", timestamp: "", completed: order.status === "DELIVERED" || shipment?.status === "DELIVERED", current: order.status === "DELIVERED" },
                  ]}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">

              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2"><IconPackage size={15} className="text-muted" /><h2 className="text-xs font-medium uppercase tracking-[0.12em]">Your order</h2></div>
                <OrderItems items={items} />
              </section>
            </div>

            <aside className="grid content-start gap-4 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
                <div className="flex items-center gap-2"><IconMapPin size={14} className="text-primary" /><h2 className="text-[10px] font-medium uppercase tracking-[0.12em]">Delivering to</h2></div>
                <div className="mt-3 text-[10px] leading-4">
                  <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
                  <p className="text-muted">{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p className="text-muted">{order.shippingAddress.line2}</p>}
                  <p className="text-muted">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="text-muted">{order.shippingAddress.country}</p>
                </div>
              </section>

              <OrderSummary order={adaptedOrder} />

              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">
                <div className="flex items-center gap-2"><IconCreditCard size={14} className="text-primary" /><h2 className="text-[10px] font-medium uppercase tracking-[0.12em]">Payment</h2></div>
                <div className="mt-3 space-y-2 text-[10px]"><div className="flex justify-between gap-4"><span className="text-muted">Provider</span><span>{order.payment?.provider ?? "—"}</span></div><div className="flex justify-between gap-4"><span className="text-muted">Status</span><span>{order.payment?.status ?? "PENDING"}</span></div></div>
              </section>

              <section className="rounded-2xl border border-border bg-surface/55 p-4 sm:p-5">

              <div className="grid gap-2">
                <Link href="/account/orders" className="flex min-h-11 items-center justify-center rounded-xl bg-primary text-xs font-medium text-white">Back to orders</Link>
                <Link href="/shop" className="flex min-h-11 items-center justify-center rounded-xl border border-border text-xs font-medium text-foreground">Continue shopping</Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
