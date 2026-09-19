import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const response = await fetch(getBackendApiUrl(`products/${encodeURIComponent(id)}/view`), {
      method: "POST",
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { error: "Unable to record product view." }, {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ error: "Metrics service is unavailable." }, { status: 503 });
  }
}
