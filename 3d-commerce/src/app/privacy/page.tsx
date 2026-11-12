import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "VOXEL 3D privacy policy, information handling and cancellation practices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PolicyPage contentKey="privacy" eyebrow="Legal" title="How VOXEL 3D Uses and Protects Your Information" intro="Your privacy matters to us. This page explains what information we collect when you use VOXEL 3D, how we use it to manage orders and support, what choices you have, and how cancellations are handled." sections={[
    { title: "Information we collect and how we use it", body: [
      "• We collect customer details such as name, phone number, email and delivery address. We use this information to process orders and provide customer support.",
      "• Customer-uploaded files are used only to fulfil custom printing orders.",
    ].join("\n") },
    { title: "Sharing and service providers", body: [
      "• Payment details are handled by our payment partners.",
      "• We do not share customers' personal information, except that information may be shared with delivery, payment and service partners when required.",
      "• We may share necessary information with payment providers, courier partners, service providers or authorities where legally required.",
      "• Our website may contain links to third-party websites. Their privacy practices are governed by their own policies.",
    ].join("\n") },
    { title: "Cookies", body: "• Our website may use cookies to improve user experience." },
    { title: "Your choices and marketing", body: [
      "• Customers may contact us to request access, correction or deletion of their information, where applicable, before the product is delivered.",
      "• Promotional communications may be sent where permitted. You may opt out of marketing messages at any time.",
    ].join("\n") },
    { title: "Retention and children", body: [
      "• Information is retained only as long as necessary for order fulfilment, business operations and legal requirements.",
      "• Our services are not intended to knowingly collect personal information from children without appropriate consent.",
    ].join("\n") },
    { title: "Order cancellations and refunds", body: [
      "• If an order is cancelled before production starts, the customer will receive a full refund.",
      "• If an order is cancelled after production has started, VOXEL 3D will decide whether a refund will be issued and determine the refund amount.",
    ].join("\n") },
    { title: "Policy updates, data breaches and contact", body: [
      "• We may update these policies from time to time. The latest version will be published on our website.",
      "• In the event of a data breach, affected customers will be notified in accordance with applicable laws.",
      "• For privacy-related queries, concerns, or complaints, customers can contact VOXEL 3D through the official contact details provided on our website.",
    ].join("\n") },
  ]} />;
}
