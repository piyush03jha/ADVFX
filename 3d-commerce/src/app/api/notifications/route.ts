import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";

export async function GET(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const unread = new URL(request.url).searchParams.get("unread") === "true";

  try {
    const response = await backendFetch(getBackendApiUrl("notifications" + (unread ? "?unread=true" : "")), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load notifications." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Notification service is unavailable." }, { status: 503 });
  }
}
