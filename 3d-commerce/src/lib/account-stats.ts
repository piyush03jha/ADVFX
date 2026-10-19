import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export type AccountStats = {
  orders: number;
  inTransit: number;
  addresses: number;
};

type OrderSummary = { status?: string; shipment?: { status?: string } | null };

/**
 * Real counts for the account overview tiles. Returns null when the visitor is
 * signed out or the API is unreachable so the UI can show "—" instead of
 * inventing numbers.
 */
export async function getAccountStats(): Promise<AccountStats | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [ordersResponse, addressesResponse] = await Promise.all([
      fetch(getBackendApiUrl("orders"), { headers, cache: "no-store" }),
      fetch(getBackendApiUrl("addresses"), { headers, cache: "no-store" }),
    ]);
    if (!ordersResponse.ok || !addressesResponse.ok) return null;

    const orders: unknown = await ordersResponse.json();
    const addresses: unknown = await addressesResponse.json();
    if (!Array.isArray(orders) || !Array.isArray(addresses)) return null;

    const inTransit = (orders as OrderSummary[]).filter(
      (order) =>
        order.status !== "CANCELLED" &&
        (order.shipment?.status === "SHIPPED" || order.shipment?.status === "IN_TRANSIT"),
    ).length;

    return { orders: orders.length, inTransit, addresses: addresses.length };
  } catch {
    return null;
  }
}
