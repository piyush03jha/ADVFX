import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopListing } from "@/components/shop/ShopListing";
import { Navbar } from "@/components/layout/SiteNavbar";
import { fetchShopCategories } from "@/lib/category-api";
import { shopListingMetadata } from "@/lib/seo-shop";
import { JsonLd } from "@/components/seo/JsonLd";
import { NO_INDEX, absoluteUrl } from "@/lib/site";

export const revalidate = 60;

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
  if (!category || category.isActive === false) notFound();

  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
    { "@type": "ListItem", position: 3, name: category.name, item: absoluteUrl(`/shop/${category.slug}`) },
  ];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs }} />
      <Navbar />
      <main id="main-content" className="min-h-screen bg-background">
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
  if (!category || category.isActive === false) return { title: "Category Not Found", robots: NO_INDEX };

  const cleanDescription = category.description?.trim().replace(/\s+/g, " ");
  const description = (cleanDescription || `Shop ${category.name} 3D printed models and collectibles from Voxel3D. Explore physical figures and display pieces made to order and shipped across India.`).slice(0, 160);

  return shopListingMetadata({
    path: `/shop/${category.slug}`,
    title: `${category.name} 3D Printed Models & Collectibles`,
    description,
    searchParams: await searchParams,
  });
}
