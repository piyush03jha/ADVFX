import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Refund Policy — FORMA", description: "FORMA refunds, cancellations, and payment reconciliation policy." };

export default function RefundPage() {
  return <PolicyPage contentKey="refund" eyebrow="Legal" title="Refund Policy" intro="This policy describes how cancellations, payment failures, refunds, and eligible returns are handled for physical orders." sections={[
    { title: "Payment failures", body: "A failed or abandoned payment does not by itself confirm an order. Temporary inventory reservations may be released when the payment window expires." },
    { title: "Duplicate or late payments", body: "If a payment is captured after the related order can no longer be fulfilled, the payment is reconciled and refunded where required. Refund timing depends on the payment provider and banking system." },
    { title: "Order cancellations", body: "Cancellation eligibility depends on the order's production and fulfillment status. Orders already in production or shipment may have different cancellation or return handling." },
    { title: "Returns and damaged products", body: "Eligible return or replacement requests should be raised through the order support process with the order number and relevant evidence. Approval depends on the product condition and the applicable return rules." },
    { title: "Refund timing", body: "Once a refund is initiated, the payment provider and customer's bank determine when the funds become visible in the original payment method." },
  ]} />;
}
