import type { Metadata } from "next";

import { Navbar } from "@/components/layout/SiteNavbar";
import { ShopListing } from "@/components/shop/ShopListing";
import { shopListingMetadata } from "@/lib/seo-shop";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
        ],
      }} />
      <Navbar />
      <main id="main-content" className="min-h-svh overflow-x-clip bg-background">
        <ShopListing searchParams={params} basePath="/shop" />
      </main>
    </>
  );
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  return shopListingMetadata({
    path: "/shop",
    title: "Shop 3D Printed Figures, Miniatures & Collectibles",
    description: "Shop physical 3D printed figures, miniatures, display models and collectibles from Voxel3D. Compare product details, explore selected interactive 3D previews and order online in India.",
    searchParams: await searchParams,
  });
}
