import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { NewArrivals } from "@/components/home/NewArrivals";
import { CustomBuild } from "@/components/home/CustomBuild";
import { BulkOrder } from "@/components/home/BulkOrder";
import { Reviews } from "@/components/home/Reviews";
import { FAQ } from "@/components/home/FAQ";

export const metadata: Metadata = {
  title: "Premium 3D Printed Models & Collectibles",
  description: "Shop premium 3D printed models, collectibles and custom builds from Voxel3D. Made to order and shipped across India.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <BestSellers />
        <ShopByCategory />
        <NewArrivals />
        <CustomBuild />
        <BulkOrder />
        <Reviews />
        <FAQ />
      </main>
    </div>
  );
}
