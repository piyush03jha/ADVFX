import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export type BackendOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPriceMinor: number;
    totalPriceMinor: number;
  }>;
  shippingAddress: {
    id: string;
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  payment: {
    status: string;
    provider: string;
  } | null;
  shipment: {
    status: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
};

export async function getBackendOrders() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) throw new Error("Authentication is required.");

  const response = await fetch(getBackendApiUrl("orders"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Unable to load orders.");
  return (await response.json()) as BackendOrder[];
}
