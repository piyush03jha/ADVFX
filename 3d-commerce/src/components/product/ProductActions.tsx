"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  IconBrandWhatsapp,
  IconCheck,
  IconMinus,
  IconPlus,
  IconShoppingCart,
  IconSparkles,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { StorefrontProduct, StorefrontVariant } from "@/lib/catalog-api";
import { buildWhatsAppUrl, useWhatsAppConfig } from "@/lib/whatsapp";

const MAX_CUSTOM_HEIGHT_CM = 500;

interface ProductActionsProps {
  product: StorefrontProduct;
  selectedVariantId: string | null;
  quantity: number;
  onVariantChange: (variantId: string | null) => void;
  onQuantityChange: (quantity: number) => void;
}

export function ProductActions({ product, selectedVariantId, quantity, onVariantChange, onQuantityChange }: ProductActionsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const variants = product.variants ?? [];
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem, error: cartError } = useCart();
  const whatsApp = useWhatsAppConfig();
  const [customHeight, setCustomHeight] = useState("");
  const [customHeightError, setCustomHeightError] = useState<string | null>(null);

  const selectedVariant = useMemo<StorefrontVariant | null>(
    () =>
      variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  // Products are manufactured after an order; there is no inventory quantity to enforce.

  const displayPrice = selectedVariant?.price ?? product.price;

  const addToCart = async () => {
    if (pending || isAuthLoading) return;
    if (!isAuthenticated) {
      router.push("/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
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

  const requestCustomSize = () => {
    const height = Number(customHeight);
    if (!customHeight.trim() || !Number.isFinite(height) || height <= 0 || height > MAX_CUSTOM_HEIGHT_CM) {
      setCustomHeightError(`Enter a height between 1 and ${MAX_CUSTOM_HEIGHT_CM} cm.`);
      return;
    }

    const heightLabel = String(Math.round(height * 10) / 10);
    const message =
      `Hi VOXEL 3D, I'd like a custom size of "${product.name}" with a height of ${heightLabel} cm. ` +
      `Product link: ${window.location.href}`;
    const url = buildWhatsAppUrl(whatsApp, message);
    if (!url) {
      setCustomHeightError("WhatsApp is not available right now. Please use the Contact page.");
      return;
    }

    setCustomHeightError(null);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const buyNow = async () => {
    if (pending || buying || isAuthLoading) return;
    if (!isAuthenticated) {
      router.push("/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
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
    <div className="mt-5 w-full sm:mt-7">
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

          <div className="grid grid-cols-3 gap-2">
            {variants.map((variant) => {
              const selected = variant.id === selectedVariantId;
              const label = variant.name + (variant.size ? " · " + variant.size : "");
              return (
                <Button
                  key={variant.id}
                  type="button"
                  variant={selected ? "primary" : "outline"}
                  size="md"
                  ariaLabel={`Select ${label}`}
                  ariaPressed={selected}
                  onClick={() => onVariantChange(variant.id)}
                  className="min-h-12 w-full justify-center rounded-xl px-3 text-center"
                >
                  <span className="text-xs font-semibold">{label}</span>
                  {selected ? <IconCheck size={14} /> : null}
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-muted">
          <span className="text-foreground">Size</span>
          <span className="ml-2">Made to order</span>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-white/[0.015] p-3 sm:mt-5">
        <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
          Need a custom size?
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          Enter the height you want for this product and we&apos;ll continue on WhatsApp.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={MAX_CUSTOM_HEIGHT_CM}
              step="any"
              value={customHeight}
              onChange={(event) => {
                setCustomHeight(event.target.value);
                setCustomHeightError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  requestCustomSize();
                }
              }}
              placeholder="Height"
              aria-label="Custom height in centimetres"
              aria-invalid={customHeightError ? true : undefined}
              className="h-11 w-full rounded-xl border border-border bg-background pl-3 pr-12 text-sm text-foreground outline-none transition focus:border-primary"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
          </div>

          <button
            type="button"
            onClick={requestCustomSize}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/60 px-4 text-xs font-medium uppercase tracking-[0.12em] text-primary transition-all hover:bg-primary/10"
          >
            <IconBrandWhatsapp size={16} />
            Request on WhatsApp
          </button>
        </div>

        {customHeightError ? (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {customHeightError}
          </p>
        ) : null}
      </div>

      <div className="mt-4 sm:mt-5">
        <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-primary">
          Quantity
        </p>

        <div className="flex h-10 w-28 items-center justify-between border border-white/[0.08] bg-white/[0.015]">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
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
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-full w-9 items-center justify-center text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlus size={13} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2 sm:mt-5 sm:gap-3">
        <p className="rounded-full bg-foreground/10 px-4 py-1.5 text-xl font-bold tracking-tight text-foreground">
          ₹{(displayPrice * quantity).toLocaleString("en-IN")}
        </p>
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted">Size × quantity</span>
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

      <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => void addToCart()}
          disabled={!product.ordersEnabled || pending}
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
              {!product.ordersEnabled ? "Orders paused" : pending ? "Adding…" : "Add to Cart"}
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => void buyNow()}
          disabled={!product.ordersEnabled || pending || buying}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/60 bg-transparent px-5 text-xs font-medium uppercase tracking-[0.14em] text-primary transition-all hover:bg-primary/8"
        >
          <IconSparkles size={15} />
          {!product.ordersEnabled ? "Unavailable" : buying ? "Opening…" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
