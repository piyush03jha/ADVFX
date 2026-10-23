import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  try {
    // Public storefront categories only; inactive categories belong in admin views.
    const response = await fetch(getBackendApiUrl("categories?includeInactive=false"), {
      next: { revalidate: 60, tags: ["catalog-categories"] },
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => []);
    return NextResponse.json(data, {
      status: response.status,
      headers: response.ok
        ? { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" }
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Category service is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const response = await fetch(getBackendApiUrl("categories"), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to create category." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Category service is unavailable." }, { status: 503 });
  }
}
