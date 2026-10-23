import type { CatalogProduct } from "@/lib/catalog-api";
import { resolveMediaUrl } from "@/lib/media-url";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

function getActiveProductPrice(product: CatalogProduct) {
  const now = Date.now();
  const prices = product.prices ?? [];
  const isCurrent = (price: (typeof prices)[number]) =>
    price.isActive &&
    (!price.startsAt || new Date(price.startsAt).getTime() <= now) &&
    (!price.endsAt || new Date(price.endsAt).getTime() > now);

  return (
    prices.find((price) => price.currency === "INR" && isCurrent(price)) ??
    prices.find((price) => price.currency === "INR" && price.isActive) ??
    prices.find((price) => price.isActive) ??
    prices[0]
  );
}

export function productImageUrls(product: CatalogProduct): string[] {
  return (product.media ?? [])
    .filter((media) => media.type === "IMAGE")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((media) => resolveMediaUrl(media.url))
    .filter((url): url is string => {
      if (typeof url !== "string" || url.length === 0) return false;
      return !url.startsWith("data:") && !url.startsWith("blob:");
    })
    .map((url) => absoluteUrl(url));
}

function isAvailable(product: CatalogProduct): boolean {
  const variants = (product.variants ?? []).filter((variant) => variant.isActive);
  if (variants.length) {
    return variants.some((variant) =>
      !variant.trackStock ||
      variant.allowBackorder ||
      (variant.stock ?? 0) - (variant.reserved ?? 0) > 0,
    );
  }
  const inventory = product.inventory;
  if (!inventory) return true;
  return !inventory.trackStock || inventory.allowBackorder || inventory.stock - inventory.reserved > 0;
}

export function buildProductJsonLd(
  product: CatalogProduct,
  opts: { url: string; rating: number; reviewCount: number },
) {
  const price = getActiveProductPrice(product);
  const images = productImageUrls(product);
  const description = product.seoDescription?.trim() || product.description?.trim() || undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: images.length ? images : undefined,
    sku: product.variants?.find((variant) => variant.sku)?.sku ?? product.slug,
    category: product.category?.name,
    material: product.material || undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: opts.url,
    ...(price ? {
      offers: {
        "@type": "Offer",
        url: opts.url,
        priceCurrency: price.currency,
        price: (price.amountMinor / 100).toFixed(2),
        availability: isAvailable(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        ...(price.startsAt ? { validFrom: price.startsAt } : {}),
        ...(price.endsAt ? { validThrough: price.endsAt } : {}),
      },
    } : {}),
    ...(opts.reviewCount > 0 && opts.rating > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(opts.rating.toFixed(1)),
        reviewCount: opts.reviewCount,
      },
    } : {}),
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
