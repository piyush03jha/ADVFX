import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ id: string }> };

async function token() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}

async function forward(request: Request, context: RouteContext, method: "PATCH" | "DELETE") {
  const value = await token();
  if (!value) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const { id } = await context.params;
    const init: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${value}`, ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) },
      cache: "no-store",
    };
    if (method === "PATCH") init.body = JSON.stringify(await request.json());

    const response = await fetch(getBackendApiUrl(`addresses/${encodeURIComponent(id)}`), init);
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update address." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return forward(request, context, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext) {
  return forward(request, context, "DELETE");
}
