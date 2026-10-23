import type { Metadata } from "next";
import { IconChevronDown } from "@tabler/icons-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { getBackendApiUrl } from "@/lib/backend-api";

export const metadata: Metadata = {
  title: "FAQ — Voxel3D Physical 3D Printed Models",
  alternates: { canonical: "/faq" },
  description: "Answers about Voxel3D physical 3D printed models, custom orders, materials, shipping, returns and product care.",
};

const fallbackFaqs = [
  {
    question: "What does Voxel3D sell?",
    answer: "Voxel3D sells physical 3D printed models, character figures, miniatures and collectibles. The storefront is for physical products, not downloadable 3D files.",
  },
  {
    question: "How does a custom 3D printed model order work?",
    answer: "Submit a custom request with JPG or PNG reference images, dimensions and any important requirements. Our team reviews the request, prepares the required model for physical production, confirms order details, and coordinates manufacturing and delivery. Custom uploads are reviewed by our team; they do not generate an instant customer-facing 3D preview.",
  },
  {
    question: "Can I view products in 3D before ordering?",
    answer: "Selected standard products include an interactive 3D viewer on their product page. The viewer helps you inspect the physical product before ordering and does not provide a downloadable 3D file.",
  },
  {
    question: "What sizes and materials are available?",
    answer: "Options depend on the product. Check its product page for available dimensions, material, finish and size variants. For a custom order, include your desired dimensions and preferences so our team can confirm what is feasible.",
  },
  {
    question: "How long does production take?",
    answer: "Production and delivery timing vary with product complexity, quantity, customization, finishing requirements and destination. The applicable estimate is confirmed for your order.",
  },
  {
    question: "Do you ship across India?",
    answer: "Voxel3D supports physical orders shipped across India. Available shipping methods and estimates depend on the destination and order. Review the shipping information or contact us before ordering if you need clarification.",
  },
  {
    question: "Can I request bulk or business orders?",
    answer: "Yes. Contact Voxel3D with the product or reference, quantity, preferred dimensions and target deadline. Our team can discuss feasibility and the next steps for your order.",
  },
  {
    question: "Can I cancel or return an order?",
    answer: "Cancellation and return eligibility depends on the order and its production or fulfillment status. Review the Refund Policy and Shipping & Returns information, or contact support for help with a specific order.",
  },
  {
    question: "How should I care for a 3D printed collectible?",
    answer: "Follow the care guidance provided for your product. In general, avoid excessive heat, prolonged direct sunlight, harsh chemicals and unnecessary impact. See the Care Guide for further information.",
  },
  {
    question: "How can I contact Voxel3D?",
    answer: "Use the Contact page or the support details in the site footer. For questions about an existing order, include your order number so the team can identify it.",
  },
];

type FaqEntry = { question: string; answer: string };

async function loadFaqs(): Promise<FaqEntry[]> {
  try {
    const response = await fetch(getBackendApiUrl("site-content/faq"), {
      next: { revalidate: 60 },
    });
    if (!response.ok) return fallbackFaqs;
    const data = (await response.json()) as { value?: unknown };
    const value = data?.value;
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as FaqEntry).question === "string" &&
          typeof (item as FaqEntry).answer === "string",
      )
    ) {
      return value as FaqEntry[];
    }
  } catch {
    // Keep a server-rendered FAQ available when the API is temporarily unavailable.
  }
  return fallbackFaqs;
}

export default async function FAQPage() {
  const faqs = await loadFaqs();
  return (
    <main id="main-content" className="min-h-[70vh] bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <section className="mx-auto max-w-[980px] px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">Help</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
            Frequently asked questions
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Everything you need to know about Voxel3D physical 3D printed models, custom creations, ordering and delivery.
          </p>
        </div>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left marker:hidden sm:py-6">
                <span className="text-sm font-medium text-foreground sm:text-base">{faq.question}</span>
                <IconChevronDown size={18} stroke={1.6} aria-hidden="true" className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="max-w-3xl pb-6 pr-8 text-sm leading-6 text-muted">{faq.answer}</div>
            </details>
          ))}
        </div>
        <p className="mt-8 text-xs leading-5 text-muted">
          Still need help?{" "}
          <a href="/contact" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">Contact us</a>.
        </p>
      </section>
    </main>
  );
}
