import { IconStar } from "@tabler/icons-react";

import type { StorefrontProduct } from "@/lib/catalog-api";

interface ProductReviewsProps {
  product: StorefrontProduct;
}

export function ProductReviews({ product }: ProductReviewsProps) {
  const hasReviews = product.reviewCount > 0;

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
              <IconStar
                size={16}
                fill="currentColor"
                className="text-primary"
              />
              <span className="text-lg font-semibold text-foreground">
                {product.rating.toFixed(1)}
              </span>
            </div>

            <span className="text-xs text-muted">
              {product.reviewCount} reviews
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/10 p-5 sm:p-6">
        {hasReviews ? (
          <p className="text-sm leading-6 text-muted">
            Reviews are available for this product.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              No reviews yet
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Verified customer reviews will appear here after they are added
              to the product catalog.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
