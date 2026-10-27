import type { Metadata } from "next";
import { Navbar } from "@/components/layout/SiteNavbar";
import { Hero } from "@/components/home/Hero";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory } from "@/components/home/shop-catogery";
import { NewArrivals } from "@/components/home/NewArrivals";
import dynamic from "next/dynamic";
import { getBackendApiUrl } from "@/lib/backend-api";
import { faqItems, type FAQItem } from "@/config/faq";
import type { CatalogProduct } from "@/lib/catalog-api";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeAbout } from "@/components/home/HomeAbout";
import { CUSTOM_ORDER_STEPS, READY_MADE_ORDER_STEPS } from "@/lib/aeo-content.mjs";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_PUBLISHED_ISO,
  absoluteUrl,
} from "@/lib/site";

// Keep heavier interactive sections out of the initial bundle.
const CustomBuild = dynamic(() =>
  import("@/components/home/CustomBuild").then((m) => m.CustomBuild),
);
const BulkOrder = dynamic(() =>
  import("@/components/home/BulkOrder").then((m) => m.BulkOrder),
);
const Reviews = dynamic(() =>
  import("@/components/home/Reviews").then((m) => m.Reviews),
);
const FAQ = dynamic(() =>
  import("@/components/home/FAQ").then((m) => m.FAQ),
);

// Revalidate homepage data periodically.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

async function loadProducts(): Promise<CatalogProduct[]> {
  try {
    const response = await fetch(getBackendApiUrl("products"), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return [];

    const payload: unknown = await response.json();

    if (Array.isArray(payload)) {
      return (payload as CatalogProduct[]).filter(
        (product) => product.status === "ACTIVE",
      );
    }

    if (payload && typeof payload === "object") {
      const value = payload as {
        items?: unknown;
        data?: unknown;
        products?: unknown;
      };

      for (const candidate of [value.items, value.data, value.products]) {
        if (Array.isArray(candidate)) {
          return (candidate as CatalogProduct[]).filter(
            (product) => product.status === "ACTIVE",
          );
        }

        if (
          candidate &&
          typeof candidate === "object" &&
          Array.isArray((candidate as { items?: unknown }).items)
        ) {
          return (candidate as { items: CatalogProduct[] }).items.filter(
            (product) => product.status === "ACTIVE",
          );
        }
      }
    }
  } catch {
    // Keep the homepage available if the catalog API is temporarily unavailable.
  }

  return [];
}

async function loadFaq(): Promise<FAQItem[]> {
  try {
    const response = await fetch(getBackendApiUrl("site-content/faq"), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const payload = (await response.json()) as { value?: unknown };

      if (
        Array.isArray(payload.value) &&
        payload.value.length > 0 &&
        payload.value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as FAQItem).id === "string" &&
            typeof (item as FAQItem).question === "string" &&
            typeof (item as FAQItem).answer === "string",
        )
      ) {
        return payload.value as FAQItem[];
      }
    }
  } catch {
    // Fall back to bundled, server-rendered FAQ content.
  }

  return faqItems;
}

export default async function Home() {
  const [products, faqs] = await Promise.all([
    loadProducts(),
    loadFaq(),
  ]);

  const featured = products.slice(0, 8);
  // Real catalog facts for the answer section: count and category names come
  // from the same API data that renders the product sections above.
  const categoryNames = Array.from(
    new Set(
      products
        .map((product) => product.category?.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const latestChange = products
    .map((product) => Date.parse(product.updatedAt ?? product.createdAt ?? ""))
    .filter((time) => !Number.isNaN(time))
    .reduce((max, time) => Math.max(max, time), Date.parse(SITE_PUBLISHED_ISO));

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Navbar />

      <main id="main-content">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": absoluteUrl("/#webpage"),
                url: absoluteUrl("/"),
                name: HOME_TITLE,
                description: HOME_DESCRIPTION,
                inLanguage: "en-IN",
                datePublished: SITE_PUBLISHED_ISO,
                dateModified: new Date(latestChange).toISOString(),
                isPartOf: { "@id": absoluteUrl("/#website") },
                about: { "@id": absoluteUrl("/#organization") },
              },
              ...(featured.length
                ? [
                    {
                      "@type": "ItemList",
                      "@id": absoluteUrl("/#products"),
                      name: "Featured 3D printed models",
                      itemListElement: featured.map((product, index) => ({
                        "@type": "ListItem",
                        position: index + 1,
                        url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`),
                        name: product.name,
                      })),
                    },
                  ]
                : []),
              {
                "@type": "FAQPage",
                mainEntity: faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: faq.answer,
                  },
                })),
              },
              // HowTo steps mirror the visible lists in the "About the shop" section.
              {
                "@type": "HowTo",
                "@id": absoluteUrl("/#how-to-order"),
                name: "How to order a ready-made 3D printed model from Voxel3D",
                description:
                  "Browse the shop, check the product page, pay online and track your order.",
                step: READY_MADE_ORDER_STEPS.map((step, index) => ({
                  "@type": "HowToStep",
                  position: index + 1,
                  name: step.name,
                  text: step.text,
                  url: absoluteUrl("/#how-to-order"),
                })),
              },
              {
                "@type": "HowTo",
                "@id": absoluteUrl("/#custom-order-steps"),
                name: "How to order a custom 3D printed model from Voxel3D",
                description:
                  "Share reference photos and requirements, let the team review them, and receive the finished physical model.",
                step: CUSTOM_ORDER_STEPS.map((step, index) => ({
                  "@type": "HowToStep",
                  position: index + 1,
                  name: step.name,
                  text: step.text,
                  url: absoluteUrl("/#custom-order-steps"),
                })),
              },
            ],
          }}
        />

        <Hero />

        <BestSellers initialProducts={products} />

        <ShopByCategory />

        <NewArrivals initialProducts={products} />

        <HomeAbout productCount={products.length} categoryNames={categoryNames} />

        <CustomBuild />

        <BulkOrder />

        <Reviews />

        <FAQ initialItems={faqs} />
      </main>
    </div>
  );
}