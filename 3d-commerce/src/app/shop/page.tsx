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
        <section className="border-t border-border bg-surface/30">
          <div className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
            <div className="max-w-3xl">
              <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">Find a model that fits your space</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Explore physical 3D printed figures, miniatures, display pieces and collectibles in the Voxel3D shop. Each product page shares the details available for that item, such as size, price, finish and images. Check these details before ordering so you know what to expect from your piece.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div><h3 className="text-base font-semibold">Check the product details</h3><p className="mt-2 text-sm leading-7 text-muted">Look at the product photos and read the description, size and other listed options. Products can differ in shape, scale and finish, so use the details on each page to help choose the right one.</p></div>
              <div><h3 className="text-base font-semibold">Explore selected 3D previews</h3><p className="mt-2 text-sm leading-7 text-muted">Some products include an interactive 3D preview. You can rotate the model and look at it from different angles in your browser. The preview helps you view the product; it is not a download of the 3D file.</p></div>
              <div><h3 className="text-base font-semibold">Need something made for you?</h3><p className="mt-2 text-sm leading-7 text-muted">If you cannot find the piece you have in mind, send us JPG or PNG reference photos and your preferred dimensions. Our team will review the request and contact you about what can be made, the price and the next steps.</p></div>
            </div>
            <div className="max-w-3xl">
              <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">Ordering and delivery</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Voxel3D sells physical products. Add the item you want to your cart, check the order details and delivery information, then complete checkout using the payment options shown. Production and delivery times can vary by product and destination. Read our <a className="underline underline-offset-4 hover:text-primary" href="/shipping">shipping and returns information</a> before ordering. For help with a product, an existing order or a bulk request, <a className="underline underline-offset-4 hover:text-primary" href="/contact">contact our team</a>. You can also visit the <a className="underline underline-offset-4 hover:text-primary" href="/faq">frequently asked questions</a> for quick answers about custom requests, product previews and delivery.</p>
            </div>
          </div>
        </section>
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
