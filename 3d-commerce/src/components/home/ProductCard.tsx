"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconShoppingCart } from "@tabler/icons-react";

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

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed
    ? "/placeholder-product.webp"
    : resolveMediaUrl(product.image) ?? "/placeholder-product.webp";

  // Product media served through /api/assets is already a production asset
  // endpoint. Bypass Next's image optimizer for proxied/API URLs; this mirrors
  // the working shop-card behavior and avoids optimizer failures on Cloudflare.
  const optimizable =
    imageSrc.startsWith("/") &&
    !imageSrc.includes("?") &&
    (imageSrc.startsWith("/storage/") ||
      imageSrc.startsWith("/categories/") ||
      imageSrc.startsWith("/catogeries/") ||
      imageSrc === "/placeholder-product.webp");

  const goToLogin = () => {
    router.push("/login?returnTo=" + encodeURIComponent("/product/" + product.slug));
  };

  const handleAddToCart = async () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    const variant = product.variants?.[0] ?? null;
    const success = await addItem(product, variant, 1);
    if (!success) return;

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Card interactive className="group h-full rounded-xl">
      <div className="relative overflow-hidden">
        <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="block">
          <div className="relative aspect-[1/0.82] overflow-hidden bg-surface-elevated/40 sm:aspect-[4/4.1]">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 639px) 190px, (max-width: 1023px) 260px, 25vw"
              quality={80}
              loading="lazy"
              unoptimized={!optimizable}
              onError={() => {
                if (!imageFailed) setImageFailed(true);
              }}
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.18),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>
        </Link>

        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
          <Badge variant="default" className="px-2 py-0.5 text-[8px]">{product.category}</Badge>
        </div>

        <WishlistButton
          product={product}
          className="absolute right-2.5 top-2.5 z-10 h-7 w-7 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
        />
      </div>

      <div className="flex flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${product.slug}`} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-medium leading-4 tracking-[-0.01em] text-foreground transition-colors duration-300 hover:text-primary-hover sm:text-sm sm:leading-5">{product.name}</h3>
          </Link>
          <div className="shrink-0 pt-0.5 text-right">{product.price > 0 ? <Price value={product.price} size="sm" /> : <span className="text-[10px] font-medium text-muted">Price on request</span>}</div>
        </div>

        {product.reviewCount > 0 && product.rating > 0 ? <Rating value={product.rating} reviewCount={product.reviewCount} size={11} showValue className="mt-2" /> : null}

        <Button
          type="button"
          variant="primary"
          size="sm"
          ariaLabel={`Add ${product.name} to cart`}
          onClick={handleAddToCart}
          disabled={isLoading || product.price <= 0}
          className="mt-3 !h-11 !min-h-11 w-full !rounded-xl !px-4 shadow-[0_0_18px_rgba(139,92,246,0.18)] sm:!h-12 sm:!min-h-12"
        >
          {added ? <IconCheck size={15} stroke={2} /> : <IconShoppingCart size={15} stroke={1.8} />}
          <span>{added ? "Added to Cart" : product.price > 0 ? "Add to Cart" : "Price on request"}</span>
        </Button>
      </div>
    </Card>
  );
}
