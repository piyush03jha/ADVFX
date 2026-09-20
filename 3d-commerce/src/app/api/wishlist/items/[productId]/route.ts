import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { productId } = await params;
  try {
    const response = await fetch(getBackendApiUrl(`wishlist/items/${encodeURIComponent(productId)}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to remove wishlist item." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Wishlist service is unavailable." }, { status: 503 });
  }
}
