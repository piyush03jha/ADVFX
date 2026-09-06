import type { Metadata } from "next";

import { Navbar } from "@/components/layout/SiteNavbar";
import { ShopProductGrid } from "@/components/shop/ShopProductGrid";

export const metadata: Metadata = {
  title: "Search Products | Forma",
  description:
    "Search Forma's collection of premium physical 3D products, collectibles, gaming products, anime products and more.",
};

export default function SearchPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="border-b border-border/50 pt-28 sm:pt-32">
          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Product search
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Find your next model.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              Search by product name or category. Results update instantly as you type.
            </p>
          </div>
        </section>

        <ShopProductGrid pageSize={12} />
      </main>
    </>
  );
}
