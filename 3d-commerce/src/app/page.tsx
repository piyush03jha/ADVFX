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
import { HomeAbout } from "@/components/home/HomeAbout";

export const metadata: Metadata = {
  // Brand first so searches for "Voxel3D" match the homepage title directly.
  title: { absolute: "Voxel3D — Premium 3D Printed Models & Collectibles in India" },
  description: "Voxel3D is an Indian studio for premium 3D printed models, collectibles and custom builds. Browse the collection or order a made-to-order piece shipped across India.",
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
        <HomeAbout />
        <FAQ />
      </main>
    </div>
  );
}
