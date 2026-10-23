import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { NewArrivals } from "@/components/home/NewArrivals";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";

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

function BrandIntroduction() {
  return (
    <section aria-labelledby="voxel3d-intro-heading" className="border-y border-border/60 bg-surface/25 py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">The Voxel3D studio</p>
          <h2 id="voxel3d-intro-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
            Physical 3D printed models, made to be collected
          </h2>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-muted sm:grid-cols-2">
            <p>
              Voxel3D is an online store for physical 3D printed models, character figures and collectibles. Explore the available collection, compare product details, and choose a piece for your desk, shelf or gift collection. Product pages provide the available images, dimensions, materials and ordering details for each item.
            </p>
            <p>
              Looking for something personal or not listed in the shop? Use our custom order service to send reference photographs and requirements. Our team reviews the request, prepares the model for production, and coordinates the physical product order and delivery. Every project is reviewed for its specific dimensions, detail and finishing needs before production.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <a className="text-primary underline-offset-4 hover:underline" href="/shop">Browse all models</a>
            <a className="text-primary underline-offset-4 hover:underline" href="/custom">Request a custom model</a>
            <a className="text-primary underline-offset-4 hover:underline" href="/shipping">Shipping and returns</a>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />
      <main id="main-content">
        <Hero />
        <BestSellers />
        <ShopByCategory />
        <NewArrivals />
        <BrandIntroduction />
        <CustomBuild />
        <BulkOrder />
        <Reviews />
        <FAQ />
      </main>
    </div>
  );
}
