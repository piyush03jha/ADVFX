import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { backendFetch, getBackendApiUrl, getTrustedClientIpHeaders } from "@/lib/backend-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await params;
  try {
    const response = await backendFetch(getBackendApiUrl("orders/" + encodeURIComponent(id) + "/cancel"), {
      method: "POST",
      headers: { ...(await getTrustedClientIpHeaders(request)), Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(response.ok ? data : {
      error: Array.isArray(data?.message) ? data.message.join(" ") : data?.message ?? data?.error ?? "Unable to cancel order.",
    }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to confirm cancellation. Refresh your order before trying again." }, { status: 503 });
  }
}
