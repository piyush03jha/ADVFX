"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconArrowLeft, IconCheck, IconFileDescription, IconQuote, IconRefresh, IconTool, IconTruck } from "@tabler/icons-react";

import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";

type CustomRequest = {
  id: string;
  title: string;
  requirements: string;
  dimensions: string | null;
  preferredMaterial?: string | null;
  preferredScale?: string | null;
  notes: string | null;
  referenceFileCount: number;
  status: string;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
  media?: Array<{ id: string; originalName: string; mimeType: string | null; fileSize: string | number }>;
  quote?: { currency: string; amountMinor: number; notes: string | null } | null;
  revisions?: Array<{ id: string; note: string; createdAt: string }>;
};

const steps = ["SUBMITTED", "UNDER_REVIEW", "IN_PRODUCTION", "ORDERABLE"];

function label(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

export default function CustomRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<CustomRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;

    fetch(`/api/custom-requests/${encodeURIComponent(params.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? data?.message ?? "Unable to load custom request.");
        return data as CustomRequest;
      })
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load custom request.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const currentIndex = request ? Math.max(0, steps.indexOf(request.status)) : 0;

  return (
    <>
      <Navbar />
      <AccountShell
        title={request?.title ?? "Custom request"}
        description="Review your submitted requirements, studio progress, references and quote."
      >
        {loading ? (
          <div className="h-96 animate-pulse rounded-3xl bg-surface" />
        ) : error || !request ? (
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-5 text-sm text-red-300">{error ?? "Custom request not found."}</div>
        ) : (
          <div className="space-y-5">
            <Link href="/account/custom-requests" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-foreground">
              <IconArrowLeft size={14} /> All custom requests
            </Link>

            <section className="rounded-3xl border border-border bg-surface p-5 shadow-[0_20px_70px_rgba(0,0,0,0.12)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-primary">Request status</p>
                  <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground">{label(request.status)}</h2>
                  <p className="mt-2 text-xs text-muted">Submitted {new Date(request.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.1em] text-primary">{request.id}</span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                {steps.map((step, index) => {
                  const completed = request.status === "CANCELLED" ? false : index <= currentIndex;
                  const current = index === currentIndex && request.status !== "ORDERABLE";
                  return (
                    <div key={step} className="rounded-2xl border border-border bg-background/30 p-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? "bg-primary/15 text-primary" : "bg-surface text-muted"}`}>
                        {completed ? <IconCheck size={15} /> : <span className="text-[10px]">{index + 1}</span>}
                      </div>
                      <p className={`mt-3 text-xs font-medium ${current ? "text-primary" : "text-foreground"}`}>{label(step)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <IconFileDescription size={18} className="text-primary" />
                    <div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Brief</p><h3 className="mt-1 text-base font-medium">Requirements</h3></div>
                  </div>
                  <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-border bg-background/35 p-4 text-sm leading-6 text-muted">{request.requirements}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Info label="Dimensions" value={request.dimensions ?? "Not specified"} />
                    <Info label="Material" value={request.preferredMaterial ?? "Studio recommendation"} />
                    <Info label="Scale" value={request.preferredScale ?? "Studio recommendation"} />
                  </div>
                  {request.notes ? <div className="mt-4"><p className="text-[9px] uppercase tracking-[0.14em] text-muted">Additional notes</p><p className="mt-2 text-sm leading-6 text-foreground">{request.notes}</p></div> : null}
                </section>

                <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <IconTool size={18} className="text-primary" />
                    <div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">References</p><h3 className="mt-1 text-base font-medium">{request.referenceFileCount} uploaded {request.referenceFileCount === 1 ? "file" : "files"}</h3></div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {(request.media ?? []).map((media) => (
                      <div key={media.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3">
                        <span className="min-w-0 truncate text-xs text-foreground">{media.originalName}</span>
                        <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-muted">{media.mimeType ?? "file"}</span>
                      </div>
                    ))}
                    {(request.media ?? []).length === 0 ? <p className="text-sm text-muted">Reference metadata is not available.</p> : null}
                  </div>
                </section>

                {(request.revisions?.length ?? 0) > 0 ? (
                  <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <IconRefresh size={18} className="text-primary" />
                      <div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Revision history</p><h3 className="mt-1 text-base font-medium">{request.revisions?.length} request(s)</h3></div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {request.revisions?.map((revision) => (
                        <div key={revision.id} className="rounded-2xl border border-border bg-background/30 p-4">
                          <p className="text-sm leading-6 text-foreground">{revision.note}</p>
                          <p className="mt-2 text-[10px] text-muted">{new Date(revision.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5">
                <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3"><IconQuote size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Studio quote</p><h3 className="mt-1 text-base font-medium">Pricing</h3></div></div>
                  <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.05] p-5">
                    {request.quote ? (
                      <>
                        <p className="text-3xl font-semibold tracking-tight text-foreground">{money(request.quote.amountMinor, request.quote.currency)}</p>
                        {request.quote.notes ? <p className="mt-3 text-xs leading-5 text-muted">{request.quote.notes}</p> : null}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">Quote pending</p>
                        <p className="mt-2 text-xs leading-5 text-muted">The studio will add pricing after reviewing your request.</p>
                      </>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3"><IconTruck size={18} className="text-primary" /><div><p className="text-[9px] uppercase tracking-[0.16em] text-primary">Next step</p><h3 className="mt-1 text-base font-medium">Stay connected</h3></div></div>
                  <p className="mt-4 text-xs leading-5 text-muted">
                    We&apos;ll update this request as the studio reviews and progresses the build. When it becomes orderable, you&apos;ll be able to continue to the physical order flow.
                  </p>
                </section>
              </aside>
            </div>
          </div>
        )}
      </AccountShell>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/30 p-4"><p className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-1 text-xs font-medium text-foreground">{value}</p></div>;
}
