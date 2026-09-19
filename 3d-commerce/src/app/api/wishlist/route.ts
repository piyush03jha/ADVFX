import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

async function getToken() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

async function proxy(
  path: string,
  init?: RequestInit,
) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(getBackendApiUrl(path), {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to process wishlist request." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Wishlist service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export async function GET() {
  return proxy("wishlist");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { productId?: unknown };

    if (
      typeof body.productId !== "string" ||
      body.productId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 },
      );
    }

    return proxy("wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId: body.productId.trim() }),
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid wishlist request." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim();

  if (productId) {
    return proxy(`wishlist/items/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  }

  return proxy("wishlist", { method: "DELETE" });
}
