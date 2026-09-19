import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

async function token() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

export async function GET() {
  const value = await token();
  if (!value) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const response = await fetch(getBackendApiUrl("users/me"), {
      headers: { Authorization: `Bearer ${value}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load account." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const value = await token();
  if (!value) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const response = await fetch(getBackendApiUrl("users/me"), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update account." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  }
}
