import { notFound } from "next/navigation";

import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { Navbar } from "@/components/layout/SiteNavbar";

// Keys must match the `slug` values in src/config/shop-catogery.ts
// Values must match `product.category` exactly, as used in
// src/config/trending-products.ts
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
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const activeCategory = SLUG_TO_CATEGORY[category];

  if (!activeCategory) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <ShopProductGrid activeCategory={activeCategory} />
    </>
  );
}