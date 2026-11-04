import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

async function proxy(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const response = await backendFetch(getBackendApiUrl("admin/manufacturing-rates"), {
      method: request.method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (request.method === "POST" && response.ok) revalidateProductCatalog();
    return NextResponse.json(data ?? { error: "Manufacturing rate operation failed." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Admin service is unavailable." }, { status: 503 });
  }
}
export async function GET(request: Request) { return proxy(request); }
export async function POST(request: Request) { return proxy(request); }
