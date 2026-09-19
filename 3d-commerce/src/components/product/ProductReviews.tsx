"use client";

import { useEffect, useState } from "react";
import { IconStar } from "@tabler/icons-react";

import type { StorefrontProduct } from "@/lib/catalog-api";

interface ProductReview {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  user: { name?: string | null };
}

interface ReviewsResponse {
  reviews: ProductReview[];
  summary: {
    rating: number;
    reviewCount: number;
  };
}

interface ProductReviewsProps {
  product: StorefrontProduct;
}

export function ProductReviews({ product }: ProductReviewsProps) {
  const [data, setData] = useState<ReviewsResponse>({
    reviews: [],
    summary: { rating: product.rating, reviewCount: product.reviewCount },
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadReviews() {
    const response = await fetch(
      `/api/products/${encodeURIComponent(product.id)}/reviews`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    setData((await response.json()) as ReviewsResponse);
  }

  useEffect(() => {
    void loadReviews().catch(() => undefined);
  }, [product.id]);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.id)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, title, comment }),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | ProductReview
        | null;

      if (!response.ok) {
        setMessage(
          body && "error" in body && body.error
            ? body.error
            : "Unable to submit your review.",
        );
        return;
      }

      setComment("");
      setTitle("");
      setMessage("Review submitted.");
      await loadReviews();
    } catch {
      setMessage("Review service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasReviews = data.summary.reviewCount > 0;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">
            Collector feedback
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-[-0.035em] text-foreground sm:text-3xl">
            What buyers say
          </h2>
        </div>

        {hasReviews ? (
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1">
              <IconStar size={16} fill="currentColor" className="text-primary" />
              <span className="text-lg font-semibold text-foreground">
                {data.summary.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted">{data.summary.reviewCount} reviews</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {hasReviews ? (
          data.reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-white/[0.07] bg-black/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <IconStar
                      key={index}
                      size={14}
                      fill={index < review.rating ? "currentColor" : "none"}
                      className={index < review.rating ? "text-primary" : "text-muted"}
                    />
                  ))}
                </div>
                {review.verifiedPurchase && (
                  <span className="text-[9px] uppercase tracking-[0.14em] text-primary">
                    Verified purchase
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                {review.title || "Customer review"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{review.comment}</p>
              <p className="mt-4 text-[11px] text-muted">
                {review.user.name || "Customer"} · {new Date(review.createdAt).toLocaleDateString("en-IN")}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-5 sm:p-6">
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Verified customer reviews will appear here after a completed purchase.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={submitReview} className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <p className="text-sm font-medium text-foreground">Write a review</p>
        <p className="mt-1 text-xs text-muted">
          Only customers who purchased this product can submit a review.
        </p>

        <div className="mt-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} stars`}
                onClick={() => setRating(value)}
                className="p-1 text-primary"
              >
                <IconStar size={18} fill={value <= rating ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Review title (optional)"
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
        />

        <textarea
          required
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Tell other customers about the physical product..."
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || comment.trim().length === 0}
            className="rounded-xl bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
          {message && <span className="text-xs text-muted">{message}</span>}
        </div>
      </form>
    </div>
  );
}
