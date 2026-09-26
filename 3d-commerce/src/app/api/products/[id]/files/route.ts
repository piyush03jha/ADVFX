import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function proxy(request: Request, context: { params: Promise<{ id: string }> }, method: "GET" | "POST") {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await context.params;

  try {
    const response = await fetch(getBackendApiUrl("products/" + encodeURIComponent(id) + "/files"), {
      method,
      headers: { Authorization: "Bearer " + token, ...(method === "POST" ? { "Content-Type": request.headers.get("content-type") ?? "" } : {}) },
      body: method === "POST" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Product file operation failed." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "GET");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "POST");
}