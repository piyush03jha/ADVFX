import { notFound } from "next/navigation";

import { ShopListing } from "@/components/shop/ShopListing";
import { Navbar } from "@/components/layout/SiteNavbar";
import { fetchShopCategories } from "@/lib/category-api";

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
  const category = categories.find(
    (item) => item.slug.toLowerCase() === catogery.toLowerCase(),
  );

  if (!category) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopListing
          searchParams={query}
          lockedCategory={category.slug}
          basePath={`/shop/${catogery}`}
        />
      </main>
    </>
  );
}
