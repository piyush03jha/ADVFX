import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function proxy(request: Request, params: Promise<{ id: string; variantId: string }>, method: "PATCH" | "DELETE") {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id, variantId } = await params;
  try {
    const response = await fetch(
      getBackendApiUrl("products/" + encodeURIComponent(id) + "/variants/" + encodeURIComponent(variantId)),
      {
        method,
        headers: {
          Authorization: "Bearer " + token,
          ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "PATCH" ? await request.text() : undefined,
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Variant operation failed." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
  return proxy(request, context.params, "PATCH");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
  return proxy(request, context.params, "DELETE");
}
