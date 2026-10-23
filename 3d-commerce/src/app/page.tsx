import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { NewArrivals } from "@/components/home/NewArrivals";
import dynamic from "next/dynamic";
import { HomeAbout } from "@/components/home/HomeAbout";

// Below-the-fold sections are still server-rendered for crawlers, but their
// client JavaScript is split out of the initial bundle to cut blocking time.
const CustomBuild = dynamic(() => import("@/components/home/CustomBuild").then((m) => m.CustomBuild));
const BulkOrder = dynamic(() => import("@/components/home/BulkOrder").then((m) => m.BulkOrder));
const Reviews = dynamic(() => import("@/components/home/Reviews").then((m) => m.Reviews));
const FAQ = dynamic(() => import("@/components/home/FAQ").then((m) => m.FAQ));

export const metadata: Metadata = {
  // Brand first so searches for "Voxel3D" match the homepage title directly.
  title: { absolute: "Voxel3D — Premium 3D Printed Models & Collectibles in India" },
  description: "Premium 3D printed models, collectibles and custom builds from Voxel3D. Browse the collection or order a made-to-order piece shipped across India.",
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
        <HomeAbout />
        <FAQ />
      </main>
    </div>
  );
}
