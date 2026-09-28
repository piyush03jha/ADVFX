"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconRefresh, IconX } from "@tabler/icons-react";

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  isPublished: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user: { name?: string | null; email?: string | null };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/products/admin/reviews", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setReviews(await response.json());
      setError("");
    } catch {
      setError("Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function setPublished(id: string, isPublished: boolean) {
    setBusy(id);
    try {
      const response = await fetch(`/api/products/admin/reviews/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished }),
      });
      if (!response.ok) throw new Error();
      setReviews((current) => current.map((review) => review.id === id ? { ...review, isPublished } : review));
    } catch {
      setError("Unable to update review.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary">Commerce</p>
          <h1 className="mt-2 font-serif text-4xl">Review moderation</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">Publish or hide customer reviews without editing the original content.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted hover:text-foreground"><IconRefresh size={14} /> Refresh</button>
      </div>

      {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs text-red-300">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading ? [1,2,3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-surface" />) : reviews.length ? reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{review.product.name}</p>
                <p className="mt-1 text-[10px] text-muted">{review.user?.name || "Customer"} · {review.user?.email || "No email"} · {new Date(review.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] ${review.isPublished ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                {review.isPublished ? "Published" : "Hidden"}
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs font-medium">{review.title || "Untitled review"} · {"★".repeat(Math.max(0, Math.min(5, review.rating)))}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={busy === review.id}
                onClick={() => void setPublished(review.id, !review.isPublished)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-[10px] font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                {review.isPublished ? <IconX size={13} /> : <IconCheck size={13} />}
                {review.isPublished ? "Hide review" : "Publish review"}
              </button>
            </div>
          </article>
        )) : <p className="rounded-2xl border border-dashed border-border p-10 text-sm text-muted">No reviews found.</p>}
      </div>
    </main>
  );
}
