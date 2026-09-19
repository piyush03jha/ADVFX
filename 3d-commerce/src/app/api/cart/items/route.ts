import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const body = await request.json();

    const backendResponse = await fetch(getBackendApiUrl("cart/items"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
