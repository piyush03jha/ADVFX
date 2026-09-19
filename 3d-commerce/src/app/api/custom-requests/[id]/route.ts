import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await params;

  try {
    const response = await fetch(getBackendApiUrl("custom-requests/" + encodeURIComponent(id)), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load custom request." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Custom request service is unavailable." }, { status: 503 });
  }
}