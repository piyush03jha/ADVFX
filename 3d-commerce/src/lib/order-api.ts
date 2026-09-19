import { CreatedOrder } from "@/lib/checkout-api";

export type OrderStatusResponse = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  payment: CreatedOrder["payment"];
  shipment: unknown;
  totalMinor: number;
  currency: string;
  order?: CreatedOrder;
};

type ApiError = { message?: string | string[]; error?: string };

export async function getOrderStatus(orderId: string) {
  const response = await fetch(`/api/checkout/orders/${encodeURIComponent(orderId)}/status`, {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as OrderStatusResponse | ApiError | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray(data.message) ? data.message[0] : data.message
        : data && typeof data === "object" && "error" in data ? data.error : undefined;
    throw new Error(message ?? "Unable to load order.");
  }
  return data as OrderStatusResponse;
}
