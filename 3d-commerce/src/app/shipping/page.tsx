import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Shipping & Returns — Voxel3D", description: "Voxel3D shipping, delivery, and return information." };

export default function ShippingPage() {
  return <PolicyPage contentKey="shipping" eyebrow="Customer care" title="Shipping & Returns" intro="Voxel3D sells physical products. Shipping availability, charges, and delivery estimates are shown during the order flow where applicable." sections={[
    { title: "Shipping", body: "Orders are shipped to supported delivery locations using available fulfillment and carrier services. Shipping charges are calculated from the applicable shipping rules and shown before payment." },
    { title: "Delivery estimates", body: "Estimated delivery windows are not guarantees. Production time, carrier capacity, address accuracy, weather, and other operational conditions can affect delivery." },
    { title: "Address accuracy", body: "Please verify your delivery address, postal code, phone number, and recipient details before completing payment. Contact support promptly if an address needs correction." },
    { title: "Tracking", body: "Where tracking is available, tracking information is associated with the order after shipment. Carrier tracking updates may take time to appear." },
    { title: "Returns", body: "Return eligibility depends on the product and order status. Custom-made products may have different return conditions because they are produced against customer-specific requirements." },
  ]} />;
}
