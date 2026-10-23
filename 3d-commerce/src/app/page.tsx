import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { NewArrivals } from "@/components/home/NewArrivals";
import dynamic from "next/dynamic";

// Keep the heavier interactive sections split out of the initial bundle.
const CustomBuild = dynamic(() => import("@/components/home/CustomBuild").then((m) => m.CustomBuild));
const BulkOrder = dynamic(() => import("@/components/home/BulkOrder").then((m) => m.BulkOrder));
const Reviews = dynamic(() => import("@/components/home/Reviews").then((m) => m.Reviews));
const FAQ = dynamic(() => import("@/components/home/FAQ").then((m) => m.FAQ));

export const metadata: Metadata = {
  title: { absolute: "Voxel3D — Premium 3D Printed Models & Collectibles in India" },
  description:
    "Shop premium 3D printed models, character figures and collectibles at Voxel3D. Order physical models online or request a custom 3D printed piece made from your reference images and shipped across India.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />
      <main id="main-content">
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
