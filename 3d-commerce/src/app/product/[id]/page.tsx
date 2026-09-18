
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendApiUrl } from "@/lib/backend-api";
import { mapCatalogProduct, mapCatalogProducts, type CatalogProduct } from "@/lib/catalog-api";

interface ProductPageProps {
  params: Promise<{ id: string }>;
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

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const products = await fetchCatalogProducts();
  const product = products.find((item) => item.id === id || item.slug === id);

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} | Forma`,
    description: product.description ?? "",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const products = await fetchCatalogProducts();
  const catalogProduct = products.find((item) => item.id === id || item.slug === id);

  if (!catalogProduct) notFound();

  const product = mapCatalogProduct(catalogProduct);
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
