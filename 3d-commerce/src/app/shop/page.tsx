import type { Metadata } from "next";

import { Navbar } from "@/components/layout/SiteNavbar";
import { ShopListing } from "@/components/shop/ShopListing";

export const metadata: Metadata = {
  title: "Shop 3D Models | Forma",
  description:
    "Explore premium physical 3D products, collectibles, gaming products, characters and custom-ready models.",
};

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  return (
    <>
      <Navbar />
      <main className="min-h-svh overflow-x-clip bg-background">
        <ShopListing searchParams={params} basePath="/shop" />
      </main>
    </>
  );
}
