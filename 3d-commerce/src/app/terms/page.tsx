import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "VOXEL 3D terms and conditions for 3D-printed products and custom printing services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <PolicyPage contentKey="terms" eyebrow="Legal" title="Terms and Conditions for Ordering from VOXEL 3D" intro="These terms explain what to expect when you buy a 3D-printed product from VOXEL 3D or ask us to make a custom piece. Please read them before placing an order." sections={[
    { title: "About VOXEL 3D and our products", body: [
      "• VOXEL 3D offers 3D-printed products and custom printing services.",
      "• Product designs, colours and finishes may vary slightly.",
      "• Minor variations in colour, layer lines, texture, and surface finishing may occur due to the 3D printing process.",
    ].join("\n") },
    { title: "Orders and custom orders", body: [
      "• Custom orders are made as per customer-approved specifications.",
      "• Orders are confirmed after successful payment.",
      "• Customers must own or have permission to use uploaded designs.",
      "• Customers are responsible for checking the details before confirming.",
      "• VOXEL 3D may cancel an order if it cannot be fulfilled.",
    ].join("\n") },
    { title: "Pricing and payments", body: [
      "• Prices are listed in INR and may change without prior notice.",
      "• Payments are accepted via Razorpay & UPI, where available.",
      "• Payments and deliveries may be handled by third-party providers and are subject to their respective terms.",
    ].join("\n") },
    { title: "Delivery", body: [
      "• Delivery timelines may vary depending on order and location.",
      "• Delivery charges will be calculated based on the customer's location, product weight, and package dimensions.",
      "• In case of delivery failure due to an incorrect address, recipient unavailability, or repeated failed delivery attempts, the customer will be eligible for a full refund.",
      "• VOXEL 3D is not responsible for delays caused by third-party services.",
    ].join("\n") },
    { title: "Returns, damage and refunds", body: [
      "• Custom-made products are generally not eligible for return or exchange unless they arrive damaged.",
      "• Refunds, if applicable, will be processed as per our policy.",
      "• Customers must contact us at hello.voxel3d@gmail.com within 2-3 days of delivery, with order details and clear photos/videos. After verification, we may offer a replacement, repair or refund, as applicable.",
      "• Approved refunds will be processed to the original payment method within 7 days.",
      "• VOXEL 3D is not liable for damage caused by misuse, improper handling or unauthorised modifications.",
    ].join("\n") },
    { title: "Governing law", body: [
      "• These terms are governed by the laws of India.",
      "• Any disputes will be subject to the jurisdiction of Delhi, India.",
    ].join("\n") },
  ]} />;
}
