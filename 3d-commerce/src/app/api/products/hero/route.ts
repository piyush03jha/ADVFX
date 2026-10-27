import { NextResponse } from "next/server";

import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";

export async function GET() {
  try {
    const response = await backendFetch(getBackendApiUrl("products/hero"), {
      next: { revalidate: 60, tags: ["catalog-products"] },
    });
    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to load hero products." },
      {
        status: response.status,
        // Let Cloudflare/browsers reuse the hero list instead of hitting the
        // API on every page view; it refreshes within a minute of changes.
        headers: response.ok
          ? { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" }
          : undefined,
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Catalog service is unavailable." },
      { status: 503 },
    );
  }
}
