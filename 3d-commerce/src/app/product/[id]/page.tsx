import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProduct, mapCatalogProducts, type CatalogProduct } from "@/lib/catalog-api";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildProductJsonLd, productImageUrls } from "@/lib/seo-product";
import { absoluteUrl, NO_INDEX } from "@/lib/site";

// Product pages are rendered on demand and revalidated in the background instead of
// being forced dynamic, so repeat visits and prefetched navigations can reuse the
// cached render. The admin catalog actions call revalidatePath for instant updates.
export const revalidate = 60;
export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

async function fetchProductReviewSummary(productId: string) {
  try {
    const response = await fetch(getBackendApiUrl(`products/${encodeURIComponent(productId)}/reviews`), {
      next: { revalidate: 60 },
    });
    if (!response.ok) return { rating: 0, reviewCount: 0 };
    const data = (await response.json()) as { summary?: { rating?: number; reviewCount?: number } };
    return {
      rating: data.summary?.rating ?? 0,
      reviewCount: data.summary?.reviewCount ?? 0,
    };
  } catch {
    return { rating: 0, reviewCount: 0 };
  }
}

/**
 * Related products come from the paginated shop endpoint (one image per product,
 * a single page) instead of downloading the entire catalog with every media file
 * and variant just to keep four items.
 */
async function fetchRelatedProducts(product: CatalogProduct): Promise<CatalogProduct[]> {
  const params = new URLSearchParams({ limit: "5", sort: "popular" });
  if (product.category?.slug) params.set("category", product.category.slug);

  try {
    const response = await fetch(getBackendApiUrl("products/shop?" + params.toString()), {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { items?: CatalogProduct[] };
    return (Array.isArray(data.items) ? data.items : [])
      .filter((item) => item.id !== product.id && item.status === "ACTIVE")
      .slice(0, 4);
  } catch {
    return [];
  }
}

const fetchProduct = cache(async (idOrSlug: string): Promise<CatalogProduct | null> => {
  const encoded = encodeURIComponent(idOrSlug);
  try {
    const response = await fetch(getBackendApiUrl("products/slug/" + encoded), { next: { revalidate: 60 } });
    if (response.ok) return (await response.json()) as CatalogProduct;
  } catch {}

  try {
    const response = await fetch(getBackendApiUrl("products/" + encoded), { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as CatalogProduct;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product || product.status !== "ACTIVE") {
    return { title: "Product Not Found", robots: NO_INDEX };
  }

  const path = `/product/${product.slug}`;
  const description = (product.seoDescription?.trim() || product.description?.trim() || "").replace(/\\s+/g, " ").slice(0, 160) || undefined;
  const seoTitle = product.seoTitle?.trim();
  const images = productImageUrls(product).slice(0, 4);
  const title = seoTitle || `${product.name} — 3D Printed Figure`;
  const canonical = product.canonicalUrl?.trim() || absoluteUrl(path);

  return {
    title: { absolute: title },
    description,
    keywords: product.seoKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: images.length ? images : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length ? images : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const catalogProduct = await fetchProduct(id);
  if (!catalogProduct || catalogProduct.status !== "ACTIVE") notFound();

  if (id !== catalogProduct.slug) {
    permanentRedirect(`/product/${encodeURIComponent(catalogProduct.slug)}`);
  }

  // Reviews and related products are independent, so fetch them in parallel.
  const [reviewSummary, relatedCatalogProducts] = await Promise.all([
    fetchProductReviewSummary(catalogProduct.id),
    fetchRelatedProducts(catalogProduct),
  ]);
  const product = {
    ...mapCatalogProduct(catalogProduct),
    rating: reviewSummary.rating,
    reviewCount: reviewSummary.reviewCount,
  };
  const relatedProducts = mapCatalogProducts(relatedCatalogProducts);

  const productPath = `/product/${catalogProduct.slug}`;
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(catalogProduct.category ? [{ name: catalogProduct.category.name, path: `/shop/${catalogProduct.category.slug}` }] : []),
    { name: catalogProduct.name, path: productPath },
  ];

  return (
    <>
      <JsonLd data={buildProductJsonLd(catalogProduct, {
        url: absoluteUrl(productPath),
        rating: reviewSummary.rating,
        reviewCount: reviewSummary.reviewCount,
      })} />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />
      <Navbar />
      <ProductDetail product={product} relatedProducts={relatedProducts} />
    </>
  );
}
