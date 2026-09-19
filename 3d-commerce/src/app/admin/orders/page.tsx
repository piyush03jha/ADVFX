"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalMinor: number;
  user?: { name?: string | null; email?: string };
  items?: Array<{ productName: string; quantity: number; variantName?: string | null }>;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOrders((await response.json()) as Order[]);
      setError("");
    } catch {
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const response = await fetch("/api/admin/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setError("Unable to update order.");
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-7xl px-4 py-10 text-xs text-muted">Loading orders…</main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Operations</p>
      <h1 className="mt-2 font-serif text-4xl">Orders</h1>
      {error && <p className="mt-4 text-xs text-red-300">{error}</p>}

      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-muted">{order.user?.email ?? order.user?.name ?? "Customer"}</p>
              </div>
              <span className="text-xs text-primary">{order.status}</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              {order.items?.map((item) => item.productName + " × " + item.quantity + (item.variantName ? " · " + item.variantName : "")).join(", ")}
            </p>
            <p className="mt-2 text-sm font-medium">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: order.currency }).format(order.totalMinor / 100)}
            </p>
            <select
              value={order.status}
              onChange={(event) => void updateStatus(order.id, event.target.value)}
              className="mt-4 h-10 rounded-xl border border-border bg-background px-3 text-xs"
            >
              <option value={order.status}>{order.status}</option>
              {(NEXT[order.status] ?? []).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </article>
        ))}
        {orders.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted">No orders found.</p>}
      </div>
    </main>
  );
}
