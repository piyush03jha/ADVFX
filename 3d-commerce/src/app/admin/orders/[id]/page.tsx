"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconArrowLeft, IconCheck, IconCreditCard, IconMapPin, IconPackage, IconRefresh, IconTruck } from "@tabler/icons-react";

type Order = {
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
  user?: { id: string; name?: string | null; email?: string; phone?: string | null } | null;
  items: Array<{ id: string; productName: string; variantName?: string | null; quantity: number; unitPriceMinor: number; totalPriceMinor: number }>;
  shippingAddress: { fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string } | null;
  payment?: { provider: string; status: string; providerPaymentId?: string | null } | null;
  shipment?: { status: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null } | null;
};

const NEXT: Record<string, string[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED", "REFUNDED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const SHIPMENT_STATUSES = ["PENDING", "LABEL_CREATED", "SHIPPED", "IN_TRANSIT", "DELIVERED", "EXCEPTION"];

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState({ status: "PENDING", carrier: "", trackingNumber: "", trackingUrl: "" });
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!params.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(params.id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to load order.");
      const next = data as Order;
      setOrder(next);
      setShipment({
        status: next.shipment?.status ?? "PENDING",
        carrier: next.shipment?.carrier ?? "",
        trackingNumber: next.shipment?.trackingNumber ?? "",
        trackingUrl: next.shipment?.trackingUrl ?? "",
      });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function changeStatus(status: string) {
    if (!order) return;
    setSavingStatus(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to update order.");
      setMessage(`Order moved to ${label(status)}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update order.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveShipment() {
    if (!order) return;
    setSavingShipment(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/shipments/order/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: shipment.status,
          carrier: shipment.carrier.trim() || undefined,
          trackingNumber: shipment.trackingNumber.trim() || undefined,
          trackingUrl: shipment.trackingUrl.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to update shipment.");
      setMessage("Shipment details saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update shipment.");
    } finally {
      setSavingShipment(false);
    }
  }

  const nextStatuses = useMemo(() => order ? NEXT[order.status] ?? [] : [], [order]);

  if (loading) return <main className="mx-auto max-w-7xl px-4 py-10 text-xs text-muted">Loading order…</main>;

  if (error && !order) {
    return <main className="mx-auto max-w-7xl px-4 py-10"><p className="text-sm text-red-300">{error}</p></main>;
  }

  if (!order) return null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-foreground"><IconArrowLeft size={14} /> Orders</Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Fulfillment console</p>
          <h1 className="mt-2 font-serif text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-xs text-muted">{order.user?.name || "Customer"} · {order.user?.email || "No email"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.08em] text-primary">{label(order.status)}</span>
          {nextStatuses.length ? (
            <select disabled={savingStatus} defaultValue="" onChange={(event) => event.target.value && void changeStatus(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-[10px]">
              <option value="">Move order…</option>
              {nextStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          ) : null}
          <button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-[10px] text-muted hover:text-foreground"><IconRefresh size={13} /> Refresh</button>
        </div>
      </div>

      {message && <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-xs text-primary">{message}</div>}
      {error && <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs text-red-300">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3"><IconPackage size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Production</p><h2 className="mt-1 text-base font-medium">Order contents</h2></div></div>
            <div className="mt-5 divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div><p className="text-sm font-medium text-foreground">{item.productName}</p><p className="mt-1 text-[10px] text-muted">{item.variantName ? `${item.variantName} · ` : ""}Qty {item.quantity}</p></div>
                  <p className="text-xs font-medium">{money(item.totalPriceMinor, order.currency)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3"><IconTruck size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Shipment</p><h2 className="mt-1 text-base font-medium">Fulfillment details</h2></div></div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Carrier" value={shipment.carrier} onChange={(value) => setShipment((current) => ({ ...current, carrier: value }))} placeholder="Delhivery, Blue Dart…" />
              <Field label="Tracking number" value={shipment.trackingNumber} onChange={(value) => setShipment((current) => ({ ...current, trackingNumber: value }))} placeholder="Tracking ID" />
              <Field label="Tracking URL" value={shipment.trackingUrl} onChange={(value) => setShipment((current) => ({ ...current, trackingUrl: value }))} placeholder="https://…" wide />
              <label className="block text-xs sm:col-span-2"><span className="text-[9px] uppercase tracking-[0.12em] text-muted">Shipment status</span><select value={shipment.status} onChange={(event) => setShipment((current) => ({ ...current, status: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary/40">{SHIPMENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            </div>

            <button onClick={() => void saveShipment()} disabled={savingShipment} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50"><IconCheck size={14} />{savingShipment ? "Saving…" : "Save shipment"}</button>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3"><IconCreditCard size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Payment</p><h2 className="mt-1 text-base font-medium">Payment status</h2></div></div>
            <div className="mt-5 space-y-3 text-xs"><Row label="Provider" value={order.payment?.provider ?? "—"} /><Row label="Status" value={order.payment?.status ?? "—"} /><Row label="Total" value={money(order.totalMinor, order.currency)} /></div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3"><IconMapPin size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Customer</p><h2 className="mt-1 text-base font-medium">Delivery address</h2></div></div>
            {order.shippingAddress ? <div className="mt-4 space-y-1 text-xs leading-5 text-muted"><p className="font-medium text-foreground">{order.shippingAddress.fullName}</p><p>{order.shippingAddress.line1}</p>{order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}<p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p><p>{order.shippingAddress.country}</p><p>{order.shippingAddress.phone}</p></div> : <p className="mt-4 text-xs text-muted">No delivery address.</p>}
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Totals</p>
            <div className="mt-4 space-y-2"><Row label="Subtotal" value={money(order.subtotalMinor, order.currency)} /><Row label="Shipping" value={money(order.shippingMinor, order.currency)} /><Row label="Tax" value={money(order.taxMinor, order.currency)} /><Row label="Discount" value={money(order.discountMinor, order.currency)} /><div className="border-t border-border pt-3"><Row label="Grand total" value={money(order.totalMinor, order.currency)} strong /></div></div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, wide }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; wide?: boolean }) {
  return <label className={wide ? "block text-xs sm:col-span-2" : "block text-xs"}><span className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary/40" /></label>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4 text-xs"><span className="text-muted">{label}</span><span className={strong ? "font-semibold text-foreground" : "text-foreground"}>{value}</span></div>;
}
