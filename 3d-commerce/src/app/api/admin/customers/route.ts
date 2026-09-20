import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function proxy(request: Request, method: string) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  let body: string | undefined;
  if (method !== "GET") body = await request.text();
  const query = new URL(request.url).search;
  try {
    const response = await fetch(getBackendApiUrl("admin/customers" + query), {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Admin service error." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Admin service is unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return proxy(request, "GET");
}
