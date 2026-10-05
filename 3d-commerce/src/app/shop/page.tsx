import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { ShopListing } from "@/components/shop/ShopListing";
import { shopListingMetadata } from "@/lib/seo-shop";

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <ShopListing searchParams={params} basePath="/shop" />
      </main>
    </>
  );
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  return shopListingMetadata({
    path: "/shop",
    title: "Shop 3D Printed Models & Collectibles",
    description:
      "Explore premium 3D printed collectibles, gaming products, characters and custom-ready models. Made to order and shipped across India.",
    searchParams: await searchParams,
  });
}