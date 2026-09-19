
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
  price?: CatalogVariantPrice | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  description?: string | null;
  category?: CatalogCategory | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
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
  price?: number;
  oldPrice?: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
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
  createdAt?: string;
}

function mapVariant(variant: CatalogVariant): StorefrontVariant | null {
  if (!variant.isActive) return null;

  const price = variant.price?.isActive ? variant.price : null;

  return {
    id: variant.id,
    name: variant.name,
    size: variant.size,
    sku: variant.sku,
    price: price ? price.amountMinor / 100 : undefined,
    oldPrice:
      price?.compareAtMinor != null
        ? price.compareAtMinor / 100
        : undefined,
  };
}

function activePrice(product: CatalogProduct): CatalogPrice | undefined {
  const prices = product.prices ?? [];
  return prices.find((price) => price.currency === "INR") ?? prices[0];
}

function primaryImage(product: CatalogProduct): string {
  return product.media.find((media) => media.type === "IMAGE" && media.isPrimary)?.url
    ?? product.media.find((media) => media.type === "IMAGE")?.url
    ?? "/catogeries/1.jpg";
}

function primaryModel(product: CatalogProduct): string {
  return product.media.find((media) => media.type === "MODEL_PREVIEW" && media.isPrimary)?.url
    ?? product.media.find((media) => media.type === "MODEL_PREVIEW")?.url
    ?? "";
}

export function mapCatalogProduct(product: CatalogProduct): StorefrontProduct {
  const price = activePrice(product);
  const amount = price?.amountMinor ?? 0;
  const compareAt = price?.compareAtMinor ?? undefined;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isBestseller: product.isBestseller,
    createdAt: product.createdAt,
    category: product.category?.name ?? "Uncategorized",
    description: product.description ?? "",
    price: amount / 100,
    currency: price?.currency ?? "INR",
    oldPrice: compareAt !== undefined ? compareAt / 100 : undefined,
    rating: 0,
    reviewCount: 0,
    image: primaryImage(product),
    model: primaryModel(product),
    format: product.media.some((media) => media.type === "MODEL_PREVIEW") ? "GLB" : "Physical",
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
