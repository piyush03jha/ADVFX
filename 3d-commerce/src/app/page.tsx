import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { CustomBuild } from "@/components/home/CustomBuild";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { TrendingNow } from "@/components/home/TrendingNow";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Reviews } from "@/components/home/Reviews";
import { FAQ } from "@/components/home/FAQ";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <BestSellers />
        <CustomBuild />
        <ShopByCategory />
        <TrendingNow />
        <NewArrivals />
        <div className="hidden sm:block">
          <Reviews />
        </div>
        <FAQ />
      </main>
    </>
  );
}