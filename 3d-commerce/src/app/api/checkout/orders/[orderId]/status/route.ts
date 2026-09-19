import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const { orderId } = await context.params;
    const response = await fetch(
      getBackendApiUrl(`checkout/orders/${encodeURIComponent(orderId)}/status`),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load order." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Checkout service is unavailable." }, { status: 503 });
  }
}
