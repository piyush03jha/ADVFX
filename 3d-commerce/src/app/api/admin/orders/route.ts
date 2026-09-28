import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const page = params.get("page") ?? "1";
  const pageSize = params.get("pageSize") ?? "25";
  try {
    const search = new URLSearchParams({ page, pageSize });
    if (status) search.set("status", status);
    const suffix = "?" + search.toString();
    const response = await fetch(getBackendApiUrl("orders/admin/list" + suffix), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load orders." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Admin service is unavailable." }, { status: 503 });
  }
}