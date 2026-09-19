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
    const response = await fetch(getBackendApiUrl("checkout/quote"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to calculate checkout quote." }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ error: "Checkout service is unavailable." }, { status: 503 });
  }
}
