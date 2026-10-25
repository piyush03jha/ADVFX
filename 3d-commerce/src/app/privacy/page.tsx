import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Voxel3D privacy policy and information handling practices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PolicyPage contentKey="privacy" eyebrow="Legal" title="How Voxel3D Uses and Protects Your Information" intro="Your privacy matters to us. This page explains in plain language what information we collect when you use Voxel3D, how we use it to manage orders and support, and what choices you have." sections={[
    { title: "Information we collect", body: "We may collect account details, contact information, delivery addresses, order details, payment references, customer-uploaded images for custom requests, and information you provide when contacting us." },
    { title: "How we use information", body: "We use information to create accounts, process physical orders, manufacture and deliver products, handle customer support, prevent fraud, maintain service security, and provide transactional notifications." },
    { title: "Payments and service providers", body: "Payment processing is handled by our payment provider. We receive payment and transaction references needed to reconcile an order; sensitive payment credentials are handled by the payment provider." },
    { title: "Retention and security", body: "We retain information for as long as reasonably necessary for order fulfillment, legal obligations, dispute handling, and legitimate business records. We use access controls and appropriate technical safeguards, while no internet service can guarantee absolute security." },
    { title: "Your choices", body: "You can request access, correction, or deletion of personal information where applicable. Some records must be retained when required for legal, accounting, payment, or order obligations." },
    { title: "Custom request images", body: "Images and details sent through a custom request are used to understand the design you want and to review whether the team can make the requested physical product. Please only upload images you have permission to share. Avoid including unrelated personal information in photos or messages." },
    { title: "Messages and customer support", body: "When you contact us, we use the information in your message to respond to your question and help with the related request or order. Please include only details needed to identify the issue. Do not send passwords, one-time passcodes, or full payment card details in a message." },
    { title: "Browser storage and site features", body: "The website may use essential browser storage or similar technologies to support features such as sign-in, cart contents, preferences and site security. The exact data used can depend on the feature and services enabled on the website." },
    { title: "Links to other services", body: "Some links, such as payment or WhatsApp contact links, take you to services run by other companies. When you use those services, their own privacy terms and practices may apply. Please review those terms before sharing information with them." },
    { title: "Contact us about privacy", body: "If you have a question about information connected to your account, order or custom request, contact Voxel3D using the Contact page. We may need enough information to confirm which record you mean before we can help. Requests are handled subject to applicable legal and business record requirements." },
  ]} />;
}
