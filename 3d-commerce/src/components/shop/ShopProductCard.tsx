"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconBolt, IconCheck, IconShoppingBag } from "@tabler/icons-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

import type { StorefrontProduct } from "@/lib/catalog-api";
import { resolveMediaUrl } from "@/lib/media-url";
import { loadModelBuffer } from "@/lib/model-loader";

interface ShopProductCardProps {
  product: StorefrontProduct;
  /** Load eagerly (first row, above the fold) instead of lazily. */
  priority?: boolean;
}

export function ShopProductCard({ product, priority = false }: ShopProductCardProps) {
  const imageSrc = resolveMediaUrl(product.image) ?? "/placeholder-product.webp";
  // API assets are delivered by the same-origin asset proxy and must bypass
  // Next Image optimization; safe local static paths can use the optimizer.
  const optimizable =
    imageSrc.startsWith("/") &&
    !imageSrc.includes("?") &&
    (imageSrc.startsWith("/storage/") ||
      imageSrc.startsWith("/categories/") ||
      imageSrc.startsWith("/catogeries/"));

  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [cartError, setCartError] = useState(false);

  // Start the GLB download during navigation so ProductGallery can join the
  // same shared request as soon as the product page mounts.
  const prefetchModel = () => {
    const modelUrl = product.model?.trim();
    if (!modelUrl) return;
    void loadModelBuffer(modelUrl).catch(() => undefined);
  };

  const handleAddToCart = async () => {
    if (added || buying) return;
    setCartError(false);

    const variant = product.variants?.[0] ?? null;
    const success = await addItem(product, variant, 1);
    if (!success) {
      setCartError(true);
      return;
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = async () => {
    if (buying || added) return;
    setBuying(true);
    setCartError(false);

    window.localStorage.setItem(
      "forma-buy-now",
      JSON.stringify({
        key: product.id + ":base",
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          currency: product.currency,
          image: product.image,
          oldPrice: product.oldPrice,
          rating: product.rating,
          reviewCount: product.reviewCount,
          badge: product.badge,
          discount: product.discount,
          model: product.model,
        },
        variantId: null,
        variantName: null,
        variantSize: null,
        size: "Standard",
        quantity: 1,
      }),
    );

    router.push("/checkout?mode=buy-now");
  };

  return (
    <Card interactive className="group h-full rounded-2xl">
      <div className="relative aspect-[0.75/1] overflow-hidden bg-surface-elevated">
        <Link href={`/product/${product.slug}`} onClick={prefetchModel} className="relative block h-full">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            unoptimized={!optimizable}
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        </Link>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.20),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        {product.badge && (
          <div className="absolute left-3 top-3">
            <Badge variant="mediaPrimary">{product.badge}</Badge>
          </div>
        )}

        <WishlistButton
          product={product}
          className="absolute right-3 top-3 z-10"
        />

        {product.discount && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="media">{product.discount}</Badge>
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-4 lg:p-5">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
          {product.category}
        </p>

        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <Link href={`/product/${product.slug}`} onClick={prefetchModel} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-medium leading-5 tracking-[-0.015em] text-foreground transition-colors hover:text-primary-hover">
              {product.name}
            </h3>
          </Link>

          <div className="flex shrink-0 flex-row items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
            {product.price > 0 ? <Price value={product.price} size="sm" /> : <span className="text-[10px] font-medium text-muted">Price on request</span>}
            {product.oldPrice !== undefined && (
              <span className="text-[10px] text-muted line-through">
                ₹{product.oldPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        {product.reviewCount > 0 && product.rating > 0 ? (
          <Rating
            value={product.rating}
            reviewCount={product.reviewCount}
            size={12}
            className="mt-2.5"
          />
        ) : null}

        {cartError ? (
          <p role="alert" className="mt-3 text-xs text-red-400">
            Unable to update your cart. Please try again.
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            disabled={product.price <= 0}
            ariaLabel={product.price <= 0 ? `Price on request for ${product.name}` : added ? "Added to cart" : `Add ${product.name} to cart`}
            className="min-h-10 w-full gap-1.5 px-2 text-xs font-semibold sm:min-h-11 sm:px-3 sm:text-sm"
          >
            {added ? <IconCheck size={16} stroke={2} aria-hidden="true" /> : <IconShoppingBag size={16} stroke={1.8} aria-hidden="true" />}<span>{added ? "Added" : product.price > 0 ? "Add" : "Price on request"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBuyNow}
            disabled={buying || product.price <= 0}
            ariaLabel={product.price <= 0 ? `Price on request for ${product.name}` : `Buy ${product.name} now`}
            className="min-h-10 w-full gap-1.5 px-2 text-xs font-semibold sm:min-h-11 sm:px-3 sm:text-sm"
          >
            <IconBolt size={16} stroke={1.8} aria-hidden="true" />
            <span>Buy</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
