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
        <header className="mx-auto w-full max-w-7xl px-5 pb-3 pt-28 sm:px-8 sm:pt-32 lg:px-12">
          <h1 className="font-serif text-3xl tracking-[-0.04em] text-foreground sm:text-5xl">Shop 3D Printed Models</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">Browse physical figures, miniatures, display models and collectibles. Check product details, explore 3D previews on selected items, and order online in India.</p>
        </header>
        <ShopListing searchParams={params} basePath="/shop" />
      </main>
    </>
  );
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  return shopListingMetadata({
    path: "/shop",
    title: "Shop 3D Printed Models",
    description: "Shop physical 3D printed models, figures, miniatures and collectibles from Voxel3D. View product details and selected 3D previews, then order online in India.",
    searchParams: await searchParams,
  });
}
