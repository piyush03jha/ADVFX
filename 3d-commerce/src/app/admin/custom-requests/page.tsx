"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconDownload,
  IconEye,
  IconFile,
  IconPhoto,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

type CustomerFile = {
  id: string;
  originalName: string;
  mimeType?: string | null;
  fileSize?: string | number | null;
};

type CustomRequest = {
  id: string;
  title: string;
  status: string;
  requirements: string;
  dimensions?: string | null;
  category?: string | null;
  sizeCm?: number | null;
  priceMinor?: number | null;
  priceCurrency?: string | null;
  notes?: string | null;
  createdAt: string;
  referenceFileCount?: number;
  media?: CustomerFile[];
  user?: { name?: string | null; email?: string | null };
};

const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PRODUCTION",
  "PREVIEW_READY",
  "CUSTOMER_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "ORDERABLE",
  "CANCELLED",
] as const;

const NEXT: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["PREVIEW_READY", "CANCELLED"],
  PREVIEW_READY: ["CUSTOMER_REVIEW", "CANCELLED"],
  CUSTOMER_REVIEW: ["REVISION_REQUESTED", "APPROVED", "CANCELLED"],
  REVISION_REQUESTED: ["IN_PRODUCTION", "CANCELLED"],
  APPROVED: ["ORDERABLE", "CANCELLED"],
  ORDERABLE: [],
  CANCELLED: [],
};

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(value: string | number | null | undefined) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0 || value == null) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: CustomerFile) {
  const extension = file.originalName.toLowerCase().split(".").pop();
  return extension === "png" || extension === "jpg" || extension === "jpeg";
}

function referenceUrl(requestId: string, fileId: string) {
  return `/api/admin/custom-requests/${encodeURIComponent(requestId)}/files/${encodeURIComponent(fileId)}`;
}

function statusStyle(status: string) {
  switch (status) {
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "ORDERABLE":
    case "APPROVED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "CANCELLED":
      return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    default:
      return "border-primary/20 bg-primary/10 text-primary";
  }
}

function FileCard({ requestId, file }: { requestId: string; file: CustomerFile }) {
  const url = referenceUrl(requestId, file.id);
  const image = isImage(file);
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/65 transition-colors hover:border-primary/35">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-surface-elevated/55 sm:h-40">
        {image ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Preview ${file.originalName}`}
            className="block h-full w-full"
          >
            <img src={url} alt={`Customer reference: ${file.originalName}`} loading="lazy" className="h-full w-full object-contain" />
          </a>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface">
              <IconFile size={27} stroke={1.5} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
              {file.originalName.split(".").pop()?.slice(0, 8) || "File"} file
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-1 text-[9px] font-medium text-foreground">
          {image ? <IconPhoto size={12} /> : <IconFile size={12} />}
          {image ? "Image" : "3D / Reference"}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <p className="truncate text-xs font-semibold text-foreground" title={file.originalName}>{file.originalName}</p>
        <p className="text-[10px] text-muted">{formatSize(file.fileSize)}</p>
        <div className="mt-auto flex gap-2 pt-1">
          {image && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 text-[11px] font-semibold text-foreground hover:border-primary/50 hover:bg-surface">
              <IconEye size={15} stroke={1.7} />
              View
            </a>
          )}
          <a href={url + "?download=1"} className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-[11px] font-semibold text-white transition hover:opacity-90">
            <IconDownload size={15} stroke={1.8} />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label: title, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface/60 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{description}</p>
    </div>
  );
}

export default function AdminCustomRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/admin/custom-requests", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error ?? "Unable to load custom requests.");
      }
      setRequests(data as CustomRequest[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load custom requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, nextStatus: string) {
    setError("");
    setNotice("");
    setUpdatingId(id);
    try {
      const response = await fetch("/api/admin/custom-requests/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        throw new Error(message ?? data?.error ?? "Unable to update custom request.");
      }
      setNotice(`Request updated to ${label(nextStatus)}.`);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update custom request.");
    } finally {
      setUpdatingId(null);
    }
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (status && request.status !== status) return false;
      if (!query) return true;
      return [
        request.title,
        request.id,
        request.user?.name,
        request.user?.email,
        request.category,
      ].some((value) => typeof value === "string" && value.toLowerCase().includes(query));
    });
  }, [requests, status, search]);

  const awaitingReview = requests.filter((request) =>
    request.status === "SUBMITTED" || request.status === "UNDER_REVIEW").length;
  const withReferences = requests.filter((request) => (request.media?.length ?? 0) > 0).length;

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <header className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_95%_0%,hsl(var(--primary)/0.12),transparent_50%)] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Custom production</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">Customer requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Review customer instructions, preview reference images, download 3D files, and manage production progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/65 px-4 text-xs font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-50"
          >
            <IconRefresh size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh requests"}
          </button>
        </div>
      </header>

      <section aria-label="Request overview" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="All requests" value={requests.length} description="Submitted customer builds" />
        <StatTile label="Awaiting review" value={awaitingReview} description="New or under review" />
        <StatTile label="With references" value={withReferences} description="Customer files available" />
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/50 p-3 sm:p-4" aria-label="Filter requests">
        <label className="relative min-w-[210px] flex-1">
          <IconSearch size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <span className="sr-only">Search customer requests</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests, customers, IDs…"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary/50"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 min-w-40 rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary/50">
            <option value="">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        <p className="ml-auto text-xs text-muted">{visible.length} shown</p>
      </section>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}

      {loading ? (
        <div className="mt-6 space-y-4" aria-busy="true">
          {[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/30 p-10 text-center">
          <p className="text-base font-semibold text-foreground">No matching requests</p>
          <p className="mt-2 text-sm text-muted">Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {visible.map((request) => {
            const files = request.media ?? [];
            return (
              <article key={request.id} className="overflow-hidden rounded-3xl border border-border bg-surface/50 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle(request.status)}`}>
                        {label(request.status)}
                      </span>
                      <span className="font-mono text-[10px] text-muted">#{request.id.slice(-9)}</span>
                    </div>
                    <h2 className="mt-3 break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">{request.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="break-all">{request.user?.name || request.user?.email || "Customer"}</span>
                      {request.user?.name && request.user?.email && <span className="break-all">{request.user.email}</span>}
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex min-w-[160px] flex-col gap-1 sm:items-end">
                    <label htmlFor={`status-${request.id}`} className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Update status</label>
                    <select
                      id={`status-${request.id}`}
                      value={request.status}
                      onChange={(event) => void updateStatus(request.id, event.target.value)}
                      disabled={updatingId !== null || (NEXT[request.status] ?? []).length === 0}
                      className="h-10 max-w-full rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value={request.status}>{label(request.status)}</option>
                      {(NEXT[request.status] ?? []).map((nextStatus) => (
                        <option key={nextStatus} value={nextStatus}>{label(nextStatus)}</option>
                      ))}
                    </select>
                    {updatingId === request.id && <span className="text-[10px] text-muted">Saving status…</span>}
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Customer reference files</h3>
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] text-muted">
                        {files.length} {files.length === 1 ? "attachment" : "attachments"}
                      </span>
                    </div>
                    {files.length > 0 ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 min-[490px]:grid-cols-2 xl:grid-cols-3">
                        {files.map((file) => <FileCard key={file.id} requestId={request.id} file={file} />)}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-7 text-center">
                        <IconFile size={24} className="mx-auto text-muted" />
                        <p className="mt-2 text-xs font-semibold text-foreground">No reference files uploaded yet</p>
                        <p className="mt-1 text-[11px] text-muted">If the customer has just uploaded files, refresh this list.</p>
                      </div>
                    )}
                  </div>

                  <aside className="space-y-3">
                    <div className="rounded-2xl border border-border bg-background/55 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Dimensions</p>
                      <p className="mt-2 break-words text-sm font-semibold text-foreground">
                        {request.dimensions || (request.sizeCm != null ? `${request.sizeCm} cm` : "Not specified")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/55 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Category</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{request.category ? label(request.category.replaceAll("-", " ")) : "Custom model"}</p>
                    </div>
                    {request.priceMinor != null && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Base price</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: request.priceCurrency || "INR" }).format(request.priceMinor / 100)}
                        </p>
                      </div>
                    )}
                  </aside>
                </div>

                <details className="group border-t border-border/70 bg-background/25 px-4 py-4 sm:px-6">
                  <summary className="cursor-pointer select-none text-xs font-semibold text-foreground hover:text-primary">
                    View customer instructions and full request details
                    <span className="ml-2 text-muted group-open:hidden">+</span>
                    <span className="ml-2 hidden text-muted group-open:inline">−</span>
                  </summary>
                  <div className="mt-4 rounded-xl border border-border bg-background/65 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Instructions</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{request.requirements || "No instructions supplied."}</p>
                    {request.notes && (
                      <>
                        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Additional notes</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{request.notes}</p>
                      </>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
