"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconChevronRight, IconFilter, IconRefresh, IconTruck } from "@tabler/icons-react";

type Order = {
  id: string;
  orderNumber: string;
  createdAt?: string;
  status: string;
  currency: string;
  totalMinor: number;
  subtotalMinor?: number;
  shippingMinor?: number;
  taxMinor?: number;
  discountMinor?: number;
  user?: { name?: string | null; email?: string };
  items?: Array<{ productName: string; quantity: number; variantName?: string | null }>;
  payment?: { status: string; provider: string } | null;
  shipment?: {
    status: string;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  } | null;
  shippingAddress?: {
    fullName: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
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

const FILTERS = [
  "ALL",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

function label(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/admin/orders${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setOrders(Array.isArray(data) ? (data as Order[]) : []);
      setError("");
    } catch {
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const response = await fetch("/api/admin/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to update order.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update order.");
    } finally {
      setBusyId(null);
    }
  }

  const visibleOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return orders;
    return orders.filter((order) =>
      [order.orderNumber, order.user?.name ?? "", order.user?.email ?? "", ...(order.items ?? []).map((item) => item.productName)]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [orders, search]);

  const counts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Operations</p>
          <h1 className="mt-2 font-serif text-4xl">Orders</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">Move paid orders through preparation, production, shipping and delivery while keeping payment and shipment state visible.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:text-foreground disabled:opacity-50">
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs text-red-300">{error}</div>}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full border px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.08em] ${filter === status ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"}`}
          >
            {status === "ALL" ? `All ${orders.length}` : `${label(status)} ${counts[status] ?? 0}`}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3">
        <IconFilter size={14} className="text-muted" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer or product…" className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted" />
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          [0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-surface" />)
        ) : visibleOrders.length ? (
          visibleOrders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_50px_rgba(0,0,0,0.1)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-muted">{order.user?.name || "Customer"} · {order.user?.email ?? "No email"}</p>
                  {order.createdAt && <p className="mt-1 text-[10px] text-muted">{new Date(order.createdAt).toLocaleString("en-IN")}</p>}
                </div>
                <div className="text-right">
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-primary">{label(order.status)}</span>
                  <p className="mt-2 text-sm font-semibold">{money(order.totalMinor, order.currency)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)]">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Items</p>
                  <p className="mt-1 text-xs leading-5 text-foreground">{order.items?.map((item) => `${item.productName} × ${item.quantity}`).join(", ") || "No items"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Payment</p>
                  <p className="mt-1 text-xs text-foreground">{order.payment ? `${order.payment.provider} · ${label(order.payment.status)}` : "Not available"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-muted">Shipment</p>
                  <p className="mt-1 text-xs text-foreground">{order.shipment ? label(order.shipment.status) : "Pending"}</p>
                  {order.shipment?.trackingNumber && <p className="mt-1 text-[10px] text-muted">{order.shipment.trackingNumber}</p>}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted hover:text-primary">
                  Open order <IconChevronRight size={13} />
                </Link>
                <div className="flex items-center gap-2">
                  {NEXT[order.status]?.length ? (
                    <select
                      disabled={busyId === order.id}
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) void updateStatus(order.id, event.target.value);
                      }}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-[10px]"
                    >
                      <option value="">Update status</option>
                      {NEXT[order.status].map((status) => <option key={status} value={status}>{label(status)}</option>)}
                    </select>
                  ) : null}
                  <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-[10px] font-semibold text-background">
                    <IconTruck size={13} /> Fulfill
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No orders match this filter.</p>
        )}
      </div>
    </main>
  );
}
