
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProduct, mapCatalogProducts, type CatalogProduct } from "@/lib/catalog-api";

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
    const response = await fetch(getBackendApiUrl("products"), {
      next: { revalidate: 60 },
    });
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

    if (response.ok) {
      return (await response.json()) as CatalogProduct;
    }
  } catch {
    // Try the ID endpoint below for backwards-compatible product URLs.
  }

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

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} | Forma`,
    description: product.description ?? "",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const catalogProduct = await fetchProduct(id);

  if (!catalogProduct) notFound();

  const products = await fetchCatalogProducts();

  const reviewSummary = await fetchProductReviewSummary(catalogProduct.id);
  const product = {
    ...mapCatalogProduct(catalogProduct),
    rating: reviewSummary.rating,
    reviewCount: reviewSummary.reviewCount,
  };
  const relatedProducts = mapCatalogProducts(
    products
      .filter((item) => item.id !== catalogProduct.id)
      .filter((item) => item.category?.id === catalogProduct.category?.id)
      .slice(0, 4),
  );

  return (
    <>
      <Navbar />
      <ProductDetail product={product} relatedProducts={relatedProducts} />
    </>
  );
}
