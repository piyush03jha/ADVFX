import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Voxel3D privacy policy and information handling practices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PolicyPage contentKey="privacy" eyebrow="Legal" title="Privacy Policy" intro="This policy explains what information Voxel3D collects, why it is used, and the choices available to customers." sections={[
    { title: "Information we collect", body: "We may collect account details, contact information, delivery addresses, order details, payment references, customer-uploaded images for custom requests, and information you provide when contacting us." },
    { title: "How we use information", body: "We use information to create accounts, process physical orders, manufacture and deliver products, handle customer support, prevent fraud, maintain service security, and provide transactional notifications." },
    { title: "Payments and service providers", body: "Payment processing is handled by our payment provider. We receive payment and transaction references needed to reconcile an order; sensitive payment credentials are handled by the payment provider." },
    { title: "Retention and security", body: "We retain information for as long as reasonably necessary for order fulfillment, legal obligations, dispute handling, and legitimate business records. We use access controls and appropriate technical safeguards, while no internet service can guarantee absolute security." },
    { title: "Your choices", body: "You can request access, correction, or deletion of personal information where applicable. Some records must be retained when required for legal, accounting, payment, or order obligations." },
  ]} />;
}
