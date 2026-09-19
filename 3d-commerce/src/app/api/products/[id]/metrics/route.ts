import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Admin authentication is required." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const response = await fetch(
      getBackendApiUrl(`products/${encodeURIComponent(id)}/metrics`),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Unable to load product metrics." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Metrics service is unavailable." },
      { status: 503 },
    );
  }
}
