import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

async function forward(request: Request, context: RouteContext, method: "PATCH" | "DELETE") {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const { productId } = await context.params;
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    const init: RequestInit = {
      method,
      headers,
      cache: "no-store",
    };

    if (method === "PATCH") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(await request.json());
    }

    const backendResponse = await fetch(
      getBackendApiUrl(`cart/items/${encodeURIComponent(productId)}`),
      init,
    );

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

export async function PATCH(request: Request, context: RouteContext) {
  return forward(request, context, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext) {
  return forward(request, context, "DELETE");
}
