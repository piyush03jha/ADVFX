import type { Metadata } from "next";

import { Navbar } from "@/components/layout/SiteNavbar";
import { ShopListing } from "@/components/shop/ShopListing";

export const metadata: Metadata = {
  title: "Search 3D Printed Models",
  description: "Search the Voxel3D collection of premium physical 3D products, collectibles and custom-ready models.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopListing searchParams={params} basePath="/search" />
      </main>
    </>
  );
}
