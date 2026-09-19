import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

async function getToken() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

async function proxy(request: Request, method: "PATCH" | "DELETE") {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const path = new URL(request.url).pathname.split("/").filter(Boolean).slice(3);
  const backendPath = path.map(encodeURIComponent).join("/");
  const query = new URL(request.url).search;
  try {
    const backendResponse = await fetch(getBackendApiUrl(`cart/${backendPath}${query}`), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "PATCH" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    const data = await backendResponse.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update cart." }, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Cart service is unavailable. Please try again." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  return proxy(request, "PATCH");
}

export async function DELETE(request: Request) {
  return proxy(request, "DELETE");
}
