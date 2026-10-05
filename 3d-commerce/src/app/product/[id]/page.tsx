import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProduct, mapCatalogProducts, type CatalogProduct } from "@/lib/catalog-api";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildProductJsonLd, productImageUrls } from "@/lib/seo-product";
import { absoluteUrl, NO_INDEX } from "@/lib/site";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

async function fetchProductReviewSummary(productId: string) {
  try {
    const response = await fetch(
      getBackendApiUrl(`products/${encodeURIComponent(productId)}/reviews`),
      { cache: "no-store" },
    );
    if (!response.ok) return { rating: 0, reviewCount: 0 };
    const data = (await response.json()) as {
      summary?: { rating?: number; reviewCount?: number };
    };
    return {
      rating: data.summary?.rating ?? 0,
      reviewCount: data.summary?.reviewCount ?? 0,
    };
  } catch {
    return { rating: 0, reviewCount: 0 };
  }
}

async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  try {
    const response = await fetch(getBackendApiUrl("products"), { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const data = (await response.json()) as CatalogProduct[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchProduct(idOrSlug: string): Promise<CatalogProduct | null> {
  const encoded = encodeURIComponent(idOrSlug);

  try {
    const response = await fetch(getBackendApiUrl("products/slug/" + encoded), {
      next: { revalidate: 60 },
    });
    if (response.ok) return (await response.json()) as CatalogProduct;
  } catch {}

  try {
    const response = await fetch(getBackendApiUrl("products/" + encoded), {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as CatalogProduct;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product || product.status !== "ACTIVE") {
    return { title: "Product Not Found", robots: NO_INDEX };
  }

  const path = `/product/${product.slug}`;
  const description =
    (product.seoDescription?.trim() || product.description?.trim() || "").slice(0, 160) || undefined;
  const seoTitle = product.seoTitle?.trim();
  const images = productImageUrls(product).slice(0, 4);

  return {
    title: seoTitle ? { absolute: seoTitle } : product.name,
    description,
    keywords: product.seoKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: absoluteUrl(path),
      title: seoTitle || product.name,
      description,
      images: images.length ? images : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle || product.name,
      description,
      images: images.length ? images : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const catalogProduct = await fetchProduct(id);

  if (!catalogProduct || catalogProduct.status !== "ACTIVE") notFound();

  if (decodeURIComponent(id) !== catalogProduct.slug) {
    permanentRedirect(`/product/${encodeURIComponent(catalogProduct.slug)}`);
  }

  const products = await fetchCatalogProducts();
  const reviewSummary = await fetchProductReviewSummary(catalogProduct.id);
  const product = {
    ...mapCatalogProduct(catalogProduct),
    rating: reviewSummary.rating,
    reviewCount: reviewSummary.reviewCount,
  };
  const relatedProducts = mapCatalogProducts(
    products
      .filter((item) => item.id !== catalogProduct.id && item.status === "ACTIVE")
      .filter((item) => item.category?.id === catalogProduct.category?.id)
      .slice(0, 4),
  );

  const productPath = `/product/${catalogProduct.slug}`;
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(catalogProduct.category
      ? [{ name: catalogProduct.category.name, path: `/shop/${catalogProduct.category.slug}` }]
      : []),
    { name: catalogProduct.name, path: productPath },
  ];

  return (
    <>
      <JsonLd
        data={buildProductJsonLd(catalogProduct, {
          url: absoluteUrl(productPath),
          rating: reviewSummary.rating,
          reviewCount: reviewSummary.reviewCount,
        })}
      />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />
      <Navbar />
      <ProductDetail product={product} relatedProducts={relatedProducts} />
    </>
  );
}
