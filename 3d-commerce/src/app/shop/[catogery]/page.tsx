import { notFound } from "next/navigation";

import { ShopListing } from "@/components/shop/ShopListing";
import { Navbar } from "@/components/layout/SiteNavbar";

// Keys must match the `slug` values in src/config/shop-catogery.ts.
// Values must match `product.category` exactly, as used in
// src/config/trending-products.ts.
const SLUG_TO_CATEGORY: Record<string, string> = {
  "custom-miniatures": "Custom",
  anime: "Anime",
  "mobile-tv": "Mobile / TV",
  gaming: "Gaming",
  heroes: "Heroes",
  collectibles: "Collectibles",
  "desk-toys": "Desk Toys",
  "weapon-props": "Weapon Props",
};

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ catogery: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The folder is named `[catogery]`, so Next.js provides the route
  // parameter under the exact same key: `catogery`.
  const { catogery } = await params;
  const query = await searchParams;
  const activeCategory = SLUG_TO_CATEGORY[catogery];

  if (!activeCategory) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopListing
          searchParams={query}
          lockedCategory={activeCategory}
          basePath={`/shop/${catogery}`}
        />
      </main>
    </>
  );
}
