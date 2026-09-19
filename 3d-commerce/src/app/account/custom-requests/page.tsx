"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowUpRight, IconBox, IconChevronRight } from "@tabler/icons-react";
import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";

type CustomRequest = {
  id: string;
  title: string;
  requirements: string;
  dimensions: string | null;
  notes: string | null;
  referenceFileCount: number;
  status: string;
  revisionCount: number;
  createdAt: string;
  quote?: { currency: string; amountMinor: number; notes: string | null } | null;
};

function label(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

export default function CustomRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/custom-requests", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error ?? data?.message ?? "Unable to load custom requests.");
        }
        return data as CustomRequest[];
      })
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data) ? data : []);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load custom requests.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />
      <AccountShell
        title="Custom requests"
        description="Follow custom builds submitted to our studio from first review through production."
      >
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-5 text-sm text-red-300">{error}</div>
        ) : requests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-muted">
              <IconBox size={22} />
            </div>
            <h2 className="mt-5 font-serif text-2xl text-foreground">No custom requests yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Start a custom build and your request history will appear here.
            </p>
            <Link href="/custom" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-semibold text-white">
              Start a custom build <IconArrowUpRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/account/custom-requests/${request.id}`}
                className="group block rounded-2xl border border-border bg-surface p-4 shadow-[0_16px_50px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 hover:border-primary/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{request.title}</p>
                    <p className="mt-1 text-[10px] text-muted">{new Date(request.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-primary">
                    {label(request.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">References</p><p className="mt-1 text-xs font-medium text-foreground">{request.referenceFileCount}</p></div>
                  <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Revisions</p><p className="mt-1 text-xs font-medium text-foreground">{request.revisionCount}</p></div>
                  <div><p className="text-[9px] uppercase tracking-[0.12em] text-muted">Quote</p><p className="mt-1 text-xs font-medium text-foreground">{request.quote ? money(request.quote.amountMinor, request.quote.currency) : "Pending review"}</p></div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[10px] text-muted">View request details</span>
                  <IconChevronRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </AccountShell>
    </>
  );
}
