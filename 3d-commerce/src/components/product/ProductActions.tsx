"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconCheck,
  IconMinus,
  IconPlus,
  IconShoppingCart,
  IconSparkles,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import type { StorefrontProduct, StorefrontVariant } from "@/lib/catalog-api";

interface ProductActionsProps {
  product: StorefrontProduct;
}

export function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem, error: cartError } = useCart();

  const selectedVariant = useMemo<StorefrontVariant | null>(
    () =>
      variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const displayPrice = selectedVariant?.price ?? product.price;

  const addToCart = async () => {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const success = await addItem(product, selectedVariant, quantity);
      if (!success) {
        setError("Unable to add this item to your cart. Please try again.");
        return;
      }

      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } finally {
      setPending(false);
    }
  };

  const buyNow = async () => {
    if (pending || buying) return;
    setBuying(true);
    setError(null);

    const buyNowItem = {
      key:
        product.id +
        ":" +
        (selectedVariant?.id ?? "base"),
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: selectedVariant?.price ?? product.price,
        currency: product.currency,
        image: product.image,
        oldPrice: selectedVariant?.oldPrice ?? product.oldPrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        badge: product.badge,
        discount: product.discount,
        model: product.model,
      },
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variantSize: selectedVariant?.size ?? null,
      size: selectedVariant?.size ?? selectedVariant?.name ?? "Standard",
      quantity,
    };

    window.localStorage.setItem(
      "forma-buy-now",
      JSON.stringify(buyNowItem),
    );
    router.push("/checkout?mode=buy-now");
  };

  return (
    <div className="mt-7 w-full">
      {variants.length > 0 ? (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
              Select size
            </p>
            <span className="text-[9px] text-muted">
              Choose your physical model size
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {variants.map((variant) => {
              const selected = variant.id === selectedVariantId;
              const label = variant.name + (variant.size ? " · " + variant.size : "");
              const priceLabel =
                variant.price !== undefined
                  ? "₹" + variant.price.toLocaleString("en-IN")
                  : "Price available in checkout";

              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={
                    "relative min-h-12 w-full rounded-xl border px-3 text-left transition-all duration-200 " +
                    (selected
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_24px_var(--glow-primary)]"
                      : "border-border bg-surface text-foreground hover:border-primary/50 hover:bg-primary/[0.04]")
                  }
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                      <IconCheck size={9} />
                    </span>
                  )}
                  <span className="block pr-6 text-xs font-medium">
                    {label}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted">
                    {priceLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted">
          <span className="text-foreground">Size</span>
          <span className="ml-2">Small · 15 cm · Medium · 20 cm · Large · 25 cm</span>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
          Quantity
        </p>

        <div className="flex h-10 w-28 items-center justify-between border border-white/[0.08] bg-white/[0.015]">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="flex h-full w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
          >
            <IconMinus size={13} />
          </button>

          <span className="min-w-4 text-center text-xs font-medium text-foreground">
            {quantity}
          </span>

          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => value + 1)}
            className="flex h-full w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
          >
            <IconPlus size={13} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-3">
        <p className="text-lg font-semibold text-foreground">
          ₹{displayPrice.toLocaleString("en-IN")}
        </p>
        {selectedVariant?.oldPrice !== undefined ? (
          <span className="text-sm text-muted line-through">
            ₹{selectedVariant.oldPrice.toLocaleString("en-IN")}
          </span>
        ) : null}
      </div>

      {(error || cartError) ? (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error ?? cartError}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => void addToCart()}
          disabled={pending}
          className="min-h-12 bg-primary text-white shadow-[0_0_30px_var(--glow-primary)] hover:bg-primary-hover"
        >
          {added ? (
            <>
              <IconCheck size={17} />
              {pending ? "Adding…" : "Added to cart"}
            </>
          ) : (
            <>
              <IconShoppingCart size={17} />
              {pending ? "Adding…" : "Add to Cart"}
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => void buyNow()}
          disabled={pending || buying}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/60 bg-transparent px-5 text-xs font-medium uppercase tracking-[0.14em] text-primary transition-all hover:bg-primary/8"
        >
          <IconSparkles size={15} />
          {buying ? "Opening…" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
