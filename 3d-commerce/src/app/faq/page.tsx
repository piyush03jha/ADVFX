import type { Metadata } from "next";
import { IconChevronDown } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "FAQ — Voxel3D",
  description: "Frequently asked questions about Voxel3D products, orders, 3D models, custom creations, shipping, and care.",
};

const faqs = [
  {
    question: "What does Voxel3D sell?",
    answer: "Voxel3D creates and sells physical 3D-printed models, collectibles, and custom creations. Products shown on the website are physical products rather than downloadable 3D files.",
  },
  {
    question: "Can I view a product in 3D before ordering?",
    answer: "Selected products include an interactive 3D viewer on their product page. The viewer is provided to help you understand the product before purchasing; it does not provide a downloadable 3D file.",
  },
  {
    question: "What sizes are available?",
    answer: "Available sizes vary by product. When a product has multiple sizes, the product page shows the available options and the price for the selected size. The shop listing shows the lowest available active size price.",
  },
  {
    question: "How does a custom order work?",
    answer: "You can submit a custom request with your reference JPG or PNG and your requirements or dimensions. Our team reviews the request, creates the required model or product, and coordinates the physical order and production process.",
  },
  {
    question: "Do you sell or provide downloadable 3D files?",
    answer: "No. Voxel3D's storefront is for physical products. Customer-facing downloadable 3D files are not part of the service.",
  },
  {
    question: "How long does an order take?",
    answer: "Production and delivery time can vary by product, quantity, customization, destination, and current production workload. The applicable delivery information is provided during the order process.",
  },
  {
    question: "Can I cancel or return an order?",
    answer: "Cancellation and return eligibility depends on the order's production and fulfillment status. Please refer to the Refund Policy and contact support with your order number if you need help.",
  },
  {
    question: "What should I do if my product arrives damaged?",
    answer: "Contact Voxel3D support as soon as possible with your order number and clear photos of the package and product. We can then review the issue and determine the appropriate resolution under the applicable return rules.",
  },
  {
    question: "How should I care for my 3D-printed product?",
    answer: "Keep the product away from excessive heat, direct prolonged sunlight, moisture, and unnecessary impact. For cleaning, use a soft dry or slightly damp cloth and avoid harsh chemicals or abrasive materials. See the Care Guide for more details.",
  },
  {
    question: "How can I contact Voxel3D?",
    answer: "You can use the Contact page or the support details provided in the footer. For an existing order, include your order number so our team can help you faster.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-[70vh] bg-background">
      <section className="mx-auto max-w-[980px] px-5 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            Help
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
            Frequently asked questions
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Everything you need to know about Voxel3D products, custom creations,
            ordering, and delivery.
          </p>
        </div>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left marker:hidden sm:py-6">
                <span className="text-sm font-medium text-foreground sm:text-base">
                  {faq.question}
                </span>
                <IconChevronDown
                  size={18}
                  stroke={1.6}
                  aria-hidden="true"
                  className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                />
              </summary>
              <div className="max-w-3xl pb-6 pr-8 text-sm leading-6 text-muted">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <p className="mt-8 text-xs leading-5 text-muted">
          Still need help?{" "}
          <a href="/contact" className="text-foreground underline decoration-border underline-offset-4 hover:text-primary">
            Contact us
          </a>
          .
        </p>
      </section>
    </main>
  );
}
