import type { Metadata } from "next";

import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { Navbar } from "@/components/layout/SiteNavbar";

export const metadata: Metadata = {
  title: "Shop 3D Models | Forma",
  description:
    "Explore premium physical 3D products, collectibles, gaming products, characters and custom-ready models.",
};

interface ShopPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopProductGrid activeCategory={params.category} />
      </main>
    </>
  );
}
