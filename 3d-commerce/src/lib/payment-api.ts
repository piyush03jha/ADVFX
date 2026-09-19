export type RazorpayOrder = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  orderNumber: string;
};

export type VerifiedPayment = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  payment: {
    id: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    status: string;
    amountMinor: number;
    currency: string;
    paidAt: string | null;
  } | null;
  totalMinor: number;
  currency: string;
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
        ? Array.isArray(data.message)
          ? data.message[0]
          : data.message
        : data && typeof data === "object" && "error" in data
          ? data.error
          : undefined;
    throw new Error(message ?? "Payment request failed.");
  }

  return data as T;
}

export function createRazorpayOrder(orderId: string) {
  return request<RazorpayOrder>("/api/payments/razorpay/order", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function retryRazorpayPayment(orderId: string) {
  return request<RazorpayOrder>("/api/payments/razorpay/retry", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function verifyRazorpayPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return request<VerifiedPayment>("/api/payments/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
