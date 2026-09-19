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
    const response = await fetch(getBackendApiUrl("custom-requests"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? [], { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Custom request service is unavailable." },
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
    const response = await fetch(getBackendApiUrl("custom-requests"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to submit custom request." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Custom request service is unavailable." },
      { status: 503 },
    );
  }
}
