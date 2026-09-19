"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { IconArrowUpRight, IconStar } from "@tabler/icons-react";

import { Container } from "@/components/ui/Container";

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  user: { name?: string | null };
  product: { id: string; name: string; slug: string };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <IconStar
          key={index}
          size={13}
          stroke={1.5}
          className={index < rating ? "fill-current text-primary" : "text-muted/20"}
        />
      ))}
    </div>
  );
}

function Reviewer({ review }: { review: Review }) {
  const name = review.user.name || "Verified customer";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[9px] font-medium text-foreground">
        {initials || "VC"}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">{name}</p>
        <p className="mt-1 truncate text-[9px] uppercase tracking-[0.1em] text-muted">
          {review.verifiedPurchase ? "Verified purchase" : "Customer review"}
        </p>
      </div>
    </div>
  );
}

function ProductTag({ product }: { product: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 truncate text-[8px] font-medium uppercase tracking-[0.14em] text-primary">
      <span className="h-px w-4 shrink-0 bg-primary/60" />
      <span className="truncate">{product}</span>
    </span>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="group flex h-full min-h-[320px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-500 hover:border-primary/25 hover:bg-surface sm:min-h-[340px] lg:min-h-[360px]"
    >
      <div className="flex shrink-0 items-center justify-between">
        <Stars rating={review.rating} />
        <IconArrowUpRight
          size={17}
          stroke={1.4}
          className="shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      <div className="flex min-h-0 flex-1 items-center py-8">
        <div className="w-full">
          <p className="line-clamp-1 text-sm font-medium text-foreground">
            {review.title || "Customer review"}
          </p>
          <p className="mt-3 line-clamp-6 w-full overflow-hidden font-serif text-lg leading-[1.35] tracking-[-0.02em] text-foreground sm:text-xl">
            “{review.comment}”
          </p>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-border pt-5">
        <Reviewer review={review} />
        <div className="mt-4">
          <ProductTag product={review.product.name} />
        </div>
      </div>
    </motion.article>
  );
}

export function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    void fetch("/api/products/reviews/latest", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = (await response.json()) as Review[];
        return Array.isArray(data) ? data : [];
      })
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  return (
    <section className="w-full overflow-hidden py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary">
              Collector feedback
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
              What buyers say
            </h2>
          </div>

          {reviews.length > 0 && (
            <p className="text-xs text-muted">Verified product reviews</p>
          )}
        </div>

        {reviews.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reviews.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-8">
            <p className="text-sm font-medium text-foreground">No customer reviews yet</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Verified reviews from completed purchases will appear here.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
