import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

async function getToken() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

export async function GET() {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(getBackendApiUrl("cart"), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load cart." }, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Cart service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(getBackendApiUrl("cart"), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to clear cart." }, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Cart service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}


export async function POST(request: Request) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const body = await request.text();
    const backendResponse = await fetch(getBackendApiUrl("cart/items"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update cart." }, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Cart service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const body = await request.text();
    const productId = new URL(request.url).pathname.split("/").filter(Boolean).pop();
    const backendResponse = await fetch(getBackendApiUrl(`cart/items/${encodeURIComponent(productId ?? "")}`), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update cart." }, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Cart service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
