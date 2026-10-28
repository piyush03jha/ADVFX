import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/SiteNavbar";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeAbout } from "@/components/home/HomeAbout";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "About Voxel3D: Our Story and Custom Models" },
  description: "Meet Voxel3D. We make physical 3D printed figures, miniatures and collectibles, and help turn your own ideas into custom pieces.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "@id": absoluteUrl("/about#webpage"),
        name: "About Voxel3D",
        url: absoluteUrl("/about"),
        description: "Learn about Voxel3D and our physical 3D printed products and custom model service.",
        isPartOf: { "@id": absoluteUrl("/#website") },
        about: { "@id": absoluteUrl("/#organization") },
      }} />
      <Navbar />
      <main id="main-content" className="px-5 pb-20 pt-28 sm:px-8 sm:pt-36 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">About us</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight tracking-[-0.05em] sm:text-6xl">We turn good ideas into real things.</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Voxel3D is a place to find physical 3D printed figures, miniatures, display models and collectibles. We care about the small details that make a piece feel special, whether it is going on your desk, on a shelf, or into a collection.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Ready-made models</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Browse our collection, check sizes and product details, and order a physical piece online. Some products also have a 3D preview so you can look at the shape before you buy.</p>
              <Link href="/shop" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">Explore the shop →</Link>
            </section>
            <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Your own idea</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Have something in mind that you cannot find in the shop? Send us JPG or PNG photos, your preferred size, and a few details. Our team will review your request and guide you through making a physical product.</p>
              <Link href="/custom" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">Request a custom model →</Link>
            </section>
          </div>
          <section className="mt-4 rounded-3xl border border-border bg-surface/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Made to be held, displayed and enjoyed</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">We sell physical products, not downloadable 3D files. For custom requests, we review your photos and requirements, prepare the model for production, and help arrange the order and delivery. What is possible and how long it takes depends on the design and details of each request.</p>
          </section>
          <section className="mt-4 rounded-3xl border border-border bg-surface/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold">How we work</h2>
            <p className="mt-3 text-sm leading-7 text-muted">For ready-made products, browse the shop, compare the details on each product page, and place an order online. Some products include a 3D preview that lets you turn the model and view it from different angles. The preview is for viewing the product in your browser; we do not sell customer downloads of 3D files.</p>
            <p className="mt-3 text-sm leading-7 text-muted">For a custom request, share clear JPG or PNG photos and tell us the size, look, quantity and any details that matter to you. Our team reviews the information and works out what may be possible. We may contact you to confirm details before the physical order is placed. A custom request does not create an instant 3D preview on the website.</p>
            <p className="mt-3 text-sm leading-7 text-muted">Each model can have different production needs, so price, finish and timing depend on the design and order details. We will guide you through the next steps once we have enough information. For an existing order, include your order details when contacting us so we can help more quickly.</p>
          </section>
          <section className="mt-4 rounded-3xl border border-border bg-surface/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Why choose Voxel3D?</h2>
            <p className="mt-3 text-sm leading-7 text-muted">We bring ready-made models and custom requests together in one place. Product pages help you review the information available before buying, while our custom request form gives you a simple way to share an idea that is not already in the collection. We aim to explain the process in everyday language and help you understand what happens next.</p>
            <p className="mt-3 text-sm leading-7 text-muted">Whether you are buying a gift, adding to a collection, decorating a desk or planning a larger order, start with the product details or tell us what you have in mind. If something is unclear, our team can help you work through the options before you decide.</p>
          </section>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90">Talk to our team</Link>
            <Link href="/faq" className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold transition hover:border-primary">Read FAQs</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
