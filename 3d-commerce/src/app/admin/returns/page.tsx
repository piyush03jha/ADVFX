"use client";

import { useEffect, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";

type ReturnRequest = {
  id: string;
  status: string;
  reason?: string | null;
  createdAt: string;
  order?: { id: string; orderNumber: string } | null;
  user?: { name?: string | null; email?: string | null } | null;
};

const NEXT: Record<string, string[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["REFUNDED"],
};

export default function AdminReturnsPage() {
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/returns", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems(await response.json());
      setError("");
    } catch {
      setError("Unable to load returns.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function update(id: string, status: string) {
    try {
      const response = await fetch(`/api/admin/returns/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setError("Unable to update return request.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Commerce</p>
          <h1 className="mt-2 font-serif text-4xl">Returns</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">Review return requests and move them through approval, receipt and refund.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:text-foreground"><IconRefresh size={14} /> Refresh</button>
      </div>
      {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs text-red-300">{error}</p>}
      <div className="mt-6 space-y-3">
        {loading ? [1,2,3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />) : items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{item.order?.orderNumber ?? item.order?.id ?? "Order"}</p>
                <p className="mt-1 text-xs text-muted">{item.user?.name || "Customer"} · {item.user?.email || "No email"}</p>
                <p className="mt-1 text-[10px] text-muted">{item.reason || "No reason supplied"} · {new Date(item.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-primary">{item.status}</span>
            </div>
            {!!NEXT[item.status]?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {NEXT[item.status].map((status) => (
                  <button key={status} type="button" onClick={() => void update(item.id, status)} className="rounded-xl border border-border px-3 py-2 text-[10px] text-muted hover:border-primary/30 hover:text-foreground">{status}</button>
                ))}
              </div>
            )}
          </article>
        )) : <p className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No return requests found.</p>}
      </div>
    </main>
  );
}
