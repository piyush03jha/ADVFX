import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopListing } from "@/components/shop/ShopListing";
import { Navbar } from "@/components/layout/SiteNavbar";
import { fetchShopCategories } from "@/lib/category-api";
import { shopListingMetadata } from "@/lib/seo-shop";
import { NO_INDEX } from "@/lib/site";

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ catogery: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { catogery } = await params;
  const query = await searchParams;
  const categories = await fetchShopCategories();
  const category = categories.find((item) => item.slug.toLowerCase() === catogery.toLowerCase());
  if (!category) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopListing searchParams={query} lockedCategory={category.slug} basePath={`/shop/${category.slug}`} />
      </main>
    </>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ catogery: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { catogery } = await params;
  const category = (await fetchShopCategories()).find((item) => item.slug.toLowerCase() === catogery.toLowerCase());
  if (!category) return { title: "Category Not Found", robots: NO_INDEX };
  return shopListingMetadata({
    path: `/shop/${category.slug}`,
    title: `${category.name} 3D Printed Models`,
    description:
      category.description?.trim().slice(0, 160) ||
      `Shop ${category.name} 3D printed models and collectibles. Premium detail, made to order and shipped across India.`,
    searchParams: await searchParams,
  });
}