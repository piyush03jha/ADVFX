import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function GET() {
  try {
    // Public storefront catalog responses can be cached briefly to support
    // homepage/product rendering without making the backend a per-request bottleneck.
    const response = await fetch(getBackendApiUrl("products"), {
      next: { revalidate: 60, tags: ["catalog-products"] },
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load products." }, {
      status: response.status,
      headers: response.ok
        ? { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Catalog service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const response = await fetch(getBackendApiUrl("products"), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      revalidateProductCatalog();
    }

    return NextResponse.json(
      data ?? { error: "Unable to create product." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}
