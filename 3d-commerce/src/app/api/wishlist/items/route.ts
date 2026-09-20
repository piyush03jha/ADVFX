import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body?.productId !== "string" || !body.productId.trim()) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }
    const response = await fetch(getBackendApiUrl("wishlist/items"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ productId: body.productId.trim() }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update wishlist." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Wishlist service is unavailable." }, { status: 503 });
  }
}
