export type CheckoutQuote = {
  currency: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    imageUrl: string | null;
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
    isDefault: boolean;
  };
  shipping: {
    amountMinor: number;
    ruleId: string | null;
    name: string | null;
    estimatedMinDays: number | null;
    estimatedMaxDays: number | null;
  };
  promotion: {
    id: string;
    code: string | null;
    type: string;
    value: number;
  } | null;
  tax: {
    ruleId: string;
    name: string;
    rateBps: number;
  } | null;
  summary: {
    subtotalMinor: number;
    shippingMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
  payment: {
    required: boolean;
    status: string;
    provider: string;
  };
};

type ApiError = { message?: string | string[]; error?: string };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as T | ApiError | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray(data.message) ? data.message[0] : data.message
        : data && typeof data === "object" && "error" in data ? data.error : undefined;
    throw new Error(message ?? "Checkout request failed.");
  }
  return data as T;
}

export function getCheckoutQuote(shippingAddressId: string, couponCode?: string) {
  return request<CheckoutQuote>("/api/checkout/quote", {
    method: "POST",
    body: JSON.stringify({ shippingAddressId, couponCode }),
  });
}

export type CreatedOrder = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  shippingAddress: CheckoutQuote["shippingAddress"];
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPriceMinor: number;
    totalPriceMinor: number;
  }>;
  payment: {
    id: string;
    provider: string;
    status: string;
    amountMinor: number;
    currency: string;
  } | null;
  shipment: unknown;
};

export function createOrder(input: {
  shippingAddressId: string;
  couponCode?: string;
  idempotencyKey: string;
  quotedSubtotalMinor: number;
  quotedShippingMinor: number;
  quotedDiscountMinor: number;
  quotedTaxMinor: number;
  quotedTotalMinor: number;
  quotedCurrency: string;
}) {
  return request<CreatedOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function formatQuoteMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}
