import { NextResponse } from "next/server";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";

export async function GET(_request: Request, context: { params: Promise<{ postalCode: string }> }) {
  const { postalCode } = await context.params;
  try {
    const response = await backendFetch(getBackendApiUrl("shipping/delivery-check/" + encodeURIComponent(postalCode)), { cache: "no-store" });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to check delivery." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Delivery service is unavailable." }, { status: 503 });
  }
}