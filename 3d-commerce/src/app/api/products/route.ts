import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  try {
    const response = await fetch(getBackendApiUrl("products"), {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to load products." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Catalog service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
