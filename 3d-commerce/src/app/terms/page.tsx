import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Terms of Service — FORMA", description: "FORMA terms of service for physical products and custom orders." };

export default function TermsPage() {
  return <PolicyPage contentKey="terms" eyebrow="Legal" title="Terms of Service" intro="These terms govern purchases of FORMA physical products and requests for custom-made physical products." sections={[
    { title: "Products and orders", body: "Product descriptions, dimensions, materials, images, availability, and prices are provided for customer reference and may change before an order is accepted. An order is subject to successful payment authorization and our ability to fulfill it." },
    { title: "Custom products", body: "Custom requests are reviewed by our team. Requirements, dimensions, references, pricing, production constraints, and delivery expectations may be confirmed before a custom order is placed." },
    { title: "Payment", body: "Payments are processed through the payment provider shown at checkout. Orders are confirmed only after successful payment reconciliation." },
    { title: "Manufacturing and delivery", body: "Physical products are manufactured or prepared for fulfillment after order confirmation. Delivery estimates are estimates and can be affected by production, carrier, address, weather, or other operational conditions." },
    { title: "Customer responsibilities", body: "Customers are responsible for accurate contact and delivery information and for ensuring submitted custom references and requirements can lawfully be used for the requested product." },
  ]} />;
}
