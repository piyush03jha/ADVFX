"use client";

import { useEffect, useMemo, useState } from "react";

type CustomRequest = {
  id: string;
  title: string;
  status: string;
  requirements: string;
  dimensions?: string | null;
  createdAt: string;
  media?: Array<{ originalName: string; mimeType?: string | null }>;
  user?: { name?: string | null; email?: string };
};

const NEXT: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["ORDERABLE", "CANCELLED"],
  ORDERABLE: [],
  CANCELLED: [],
};

export default function AdminCustomRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/custom-requests", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setRequests((await response.json()) as CustomRequest[]);
      setError("");
    } catch {
      setError("Unable to load custom requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, nextStatus: string) {
    try {
      const response = await fetch("/api/admin/custom-requests/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setError("Unable to update custom request.");
    }
  }

  const visible = useMemo(
    () => requests.filter((request) => !status || request.status === status),
    [requests, status],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Custom production</p>
          <h1 className="mt-2 font-serif text-4xl">Requests</h1>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-xs"
        >
          <option value="">All statuses</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="IN_PRODUCTION">IN_PRODUCTION</option>
          <option value="ORDERABLE">ORDERABLE</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
      {loading ? (
        <p className="mt-6 text-xs text-muted">Loading requests…</p>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((request) => (
            <article key={request.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">{request.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {request.user?.email ?? request.user?.name ?? "Customer"} · {new Date(request.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="text-xs text-primary">{request.status}</span>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted">{request.requirements}</p>
              <p className="mt-2 text-xs text-muted">
                Dimensions: {request.dimensions ?? "Not specified"} · References: {request.media?.length ?? 0}
              </p>
              <select
                value={request.status}
                onChange={(event) => void updateStatus(request.id, event.target.value)}
                className="mt-4 h-10 rounded-xl border border-border bg-background px-3 text-xs"
              >
                <option value={request.status}>{request.status}</option>
                {(NEXT[request.status] ?? []).map((nextStatus) => (
                  <option key={nextStatus} value={nextStatus}>{nextStatus}</option>
                ))}
              </select>
            </article>
          ))}
          {visible.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted">No requests found.</p>}
        </div>
      )}
    </main>
  );
}
