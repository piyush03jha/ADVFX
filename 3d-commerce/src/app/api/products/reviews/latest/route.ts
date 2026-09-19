import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  try {
    const response = await fetch(getBackendApiUrl("products/reviews/latest"), {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? [], { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Review service is unavailable." },
      { status: 503 },
    );
  }
}
