import type { CatalogProduct } from "@/lib/catalog-api";
import { resolveMediaUrl } from "@/lib/media-url";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

function getActiveProductPrice(product: CatalogProduct) {
  const now = Date.now();
  const prices = product.prices ?? [];
  const current = (price: (typeof prices)[number]) =>
    price.isActive &&
    (!price.startsAt || new Date(price.startsAt).getTime() <= now) &&
    (!price.endsAt || new Date(price.endsAt).getTime() > now);

  return (
    prices.find((price) => price.currency === "INR" && current(price)) ??
    prices.find((price) => price.currency === "INR" && price.isActive) ??
    prices.find((price) => price.isActive) ??
    prices[0]
  );
}

export function productImageUrls(product: CatalogProduct): string[] {
  return (product.media ?? [])
    .filter((m) => m.type === "IMAGE")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((m) => resolveMediaUrl(m.url))
    .filter((u): u is string => !!u && !u.startsWith("data:") && !u.startsWith("blob:"))
    .map((u) => absoluteUrl(u));
}

function isAvailable(product: CatalogProduct): boolean {
  const variants = (product.variants ?? []).filter((v) => v.isActive);
  if (variants.length) {
    return variants.some((v) => !v.trackStock || v.allowBackorder || (v.stock ?? 0) - (v.reserved ?? 0) > 0);
  }
  const inv = product.inventory;
  if (!inv) return true;
  return !inv.trackStock || inv.allowBackorder || inv.stock - inv.reserved > 0;
}

export function buildProductJsonLd(
  product: CatalogProduct,
  opts: { url: string; rating: number; reviewCount: number },
) {
  const price = getActiveProductPrice(product);
  const images = productImageUrls(product);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description?.trim() || undefined,
    image: images.length ? images : undefined,
    sku: product.variants?.find((v) => v.sku)?.sku ?? product.slug,
    category: product.category?.name,
    material: product.material || undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: opts.url,
    offers: price ? {
      "@type": "Offer",
      url: opts.url,
      priceCurrency: price.currency,
      price: (price.amountMinor / 100).toFixed(2),
      availability: isAvailable(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(price.startsAt ? { validFrom: price.startsAt } : {}),
      ...(price.endsAt ? { validThrough: price.endsAt } : {}),
    } : undefined,
    aggregateRating: opts.reviewCount > 0 && opts.rating > 0 ? {
      "@type": "AggregateRating",
      ratingValue: Number(opts.rating.toFixed(1)),
      reviewCount: opts.reviewCount,
    } : undefined,
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
