import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const response = await fetch(getBackendApiUrl(`products/${encodeURIComponent(id)}/metrics`), {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { error: "Unable to load product metrics." }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ error: "Metrics service is unavailable." }, { status: 503 });
  }
}
