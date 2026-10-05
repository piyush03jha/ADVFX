
export interface CatalogMedia {
  id: string;
  type: "IMAGE" | "MODEL_PREVIEW";
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CatalogTag {
  tag: { name: string; slug: string };
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogPrice {
  id: string;
  currency: string;
  amountMinor: number;
  compareAtMinor?: number | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface CatalogVariantPrice {
  id: string;
  currency: string;
  amountMinor: number;
  compareAtMinor?: number | null;
  isActive: boolean;
}

export interface CatalogVariant {
  id: string;
  name: string;
  size?: string | null;
  sku?: string | null;
  isActive: boolean;
  stock?: number;
  reserved?: number;
  lowStockAt?: number;
  trackStock?: boolean;
  allowBackorder?: boolean;
  price?: CatalogVariantPrice | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  category?: CatalogCategory | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  /** Present on paginated shop listings (aggregated from published reviews). */
  rating?: number;
  reviewCount?: number;
  badge?: string | null;
  material?: string | null;
  scale?: string | null;
  dimensions?: string | null;
  height?: string | null;
  base?: string | null;
  packaging?: string | null;
  weight?: string | null;
  prices: CatalogPrice[];
  variants?: CatalogVariant[];
  media: CatalogMedia[];
  tags: CatalogTag[];
  metrics?: {
    viewCount: number;
    cartAddCount: number;
    purchaseCount: number;
    unitsSold: number;
  } | null;
  inventory?: {
    stock: number;
    reserved: number;
    lowStockAt: number;
    trackStock: boolean;
    allowBackorder: boolean;
  } | null;
}

export interface StorefrontVariant {
  id: string;
  name: string;
  size?: string | null;
  sku?: string | null;
  stock?: number;
  reserved?: number;
  lowStockAt?: number;
  trackStock?: boolean;
  allowBackorder?: boolean;
  price?: number;
  oldPrice?: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug?: string;
  description: string;
  price: number;
  currency: string;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  images: string[];
  model: string;
  format: string;
  fileSize: string;
  polygonCount: string;
  textureResolution?: string;
  badge?: string;
  discount?: string;
  tags: string[];
  material?: string | null;
  scale?: string | null;
  dimensions?: string | null;
  height?: string | null;
  base?: string | null;
  packaging?: string | null;
  weight?: string | null;
  variants: StorefrontVariant[];
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  stock: number;
  reserved: number;
  trackStock: boolean;
  allowBackorder: boolean;
  createdAt?: string;
  metrics: {
    views: number;
    cartAdds: number;
    purchases: number;
    unitsSold: number;
  };
}

function mapVariant(variant: CatalogVariant): StorefrontVariant | null {
  if (!variant.isActive) return null;

  const price = variant.price?.isActive ? variant.price : null;

  return {
    id: variant.id,
    name: variant.name,
    size: variant.size,
    sku: variant.sku,
    stock: variant.stock ?? 0,
    reserved: variant.reserved ?? 0,
    lowStockAt: variant.lowStockAt ?? 5,
    trackStock: variant.trackStock ?? false,
    allowBackorder: variant.allowBackorder ?? false,
    price: price ? price.amountMinor / 100 : undefined,
    oldPrice:
      price?.compareAtMinor != null
        ? price.compareAtMinor / 100
        : undefined,
  };
}

function activePrice(product: CatalogProduct): CatalogPrice | undefined {
  const now = Date.now();
  const prices = product.prices ?? [];

  const isCurrentlyActive = (
    price: CatalogPrice & { startsAt?: string | null; endsAt?: string | null },
  ) =>
    price.isActive &&
    (!price.startsAt || new Date(price.startsAt).getTime() <= now) &&
    (!price.endsAt || new Date(price.endsAt).getTime() > now);

  return (
    prices.find(
      (price) =>
        price.currency === "INR" &&
        isCurrentlyActive(
          price as CatalogPrice & {
            startsAt?: string | null;
            endsAt?: string | null;
          },
        ),
    ) ??
    prices.find(
      (price) =>
        price.currency === "INR" &&
        price.isActive,
    ) ??
    prices.find(
      (price) => price.isActive,
    ) ??
    prices[0]
  );
}

const PRODUCTION_ASSET_BASE_URL = "https://api.voxel3d.org";

export function assetUrl(url: string): string {
  const value = url.trim();
  if (!value) return "";

  const configuredBase =
    process.env.NEXT_PUBLIC_ASSET_BASE_URL?.trim().replace(/\/$/, "");

  const baseUrl =
    configuredBase ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_ASSET_BASE_URL
      : "");

  if (!baseUrl) return value;

  try {
    const parsed = new URL(value, "https://voxel3d.org");
    if (!parsed.pathname.startsWith("/api/assets/")) return value;

    const base = new URL(baseUrl);
    // The old assets.voxel3d.org hostname is no longer a Railway custom
    // domain. Keep deployments self-healing if an old environment variable
    // is still present.
    if (base.hostname === "assets.voxel3d.org") {
      base.hostname = "api.voxel3d.org";
    }

    return base.toString().replace(/\/$/, "") + parsed.pathname + parsed.search;
  } catch {
    return value;
  }
}

function primaryImage(product: CatalogProduct): string {
  return product.media.find((media) => media.type === "IMAGE" && media.isPrimary)?.url
    ?? product.media.find((media) => media.type === "IMAGE")?.url
    ?? "/catogeries/1.jpg";
}

function primaryModel(product: CatalogProduct): string {
  const models = product.media.filter(
    (media) => media.type === "MODEL_PREVIEW" && media.url.trim(),
  );

  return (
    assetUrl(models.find((media) => media.isPrimary)?.url ?? "") ||
    assetUrl(models[0]?.url ?? "") ||
    ""
  );
}

export function mapCatalogProduct(product: CatalogProduct): StorefrontProduct {
  const price = activePrice(product);
  const variantPrices = (product.variants ?? [])
    .filter((variant) => variant.isActive)
    .map((variant) => {
      const variantPrice = variant.price;
      if (!variantPrice?.isActive) return null;

      return {
        amountMinor: variantPrice.amountMinor,
        compareAtMinor: variantPrice.compareAtMinor ?? undefined,
        currency: variantPrice.currency,
      };
    })
    .filter(
      (
        variantPrice,
      ): variantPrice is {
        amountMinor: number;
        compareAtMinor: number | undefined;
        currency: string;
      } => variantPrice !== null,
    );

  // Show the lowest currently active variant price for products with sizes.
  const lowestVariantPrice = variantPrices
    .filter((variantPrice) => variantPrice.currency === "INR")
    .sort((a, b) => a.amountMinor - b.amountMinor)[0]
    ?? variantPrices.sort((a, b) => a.amountMinor - b.amountMinor)[0];

  const amount = lowestVariantPrice?.amountMinor ?? price?.amountMinor ?? 0;
  const compareAt =
    lowestVariantPrice?.compareAtMinor ?? price?.compareAtMinor ?? undefined;
  const currency = lowestVariantPrice?.currency ?? price?.currency ?? "INR";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isBestseller: product.isBestseller,
    stock: product.inventory?.stock ?? 0,
    reserved: product.inventory?.reserved ?? 0,
    trackStock: product.inventory?.trackStock ?? false,
    allowBackorder: product.inventory?.allowBackorder ?? false,
    createdAt: product.createdAt,
    category: product.category?.name ?? "Uncategorized",
    categorySlug: product.category?.slug,
    description: product.description ?? "",
    price: amount / 100,
    currency,
    oldPrice: compareAt !== undefined ? compareAt / 100 : undefined,
    rating: 0,
    reviewCount: 0,
    image: primaryImage(product),
    images: product.media
      .filter((media) => media.type === "IMAGE")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((media) => media.url),
    model: primaryModel(product),
    format: primaryModel(product) ? "GLB" : "Physical",
    fileSize: "",
    polygonCount: "",
    textureResolution: undefined,
    badge: product.badge ?? undefined,
    discount:
      compareAt !== undefined && compareAt > amount
        ? `${Math.round(((compareAt - amount) / compareAt) * 100)}% OFF`
        : undefined,
    tags: product.tags.map((item) => item.tag.name),
    material: product.material,
    scale: product.scale,
    dimensions: product.dimensions,
    height: product.height,
    base: product.base,
    packaging: product.packaging,
    weight: product.weight,
    metrics: {
      views: product.metrics?.viewCount ?? 0,
      cartAdds: product.metrics?.cartAddCount ?? 0,
      purchases: product.metrics?.purchaseCount ?? 0,
      unitsSold: product.metrics?.unitsSold ?? 0,
    },
    variants: (product.variants ?? [])
      .map(mapVariant)
      .filter(
        (variant): variant is StorefrontVariant => Boolean(variant),
      ),
  };
}

export function mapCatalogProducts(products: CatalogProduct[]): StorefrontProduct[] {
  return products.map(mapCatalogProduct);
}
