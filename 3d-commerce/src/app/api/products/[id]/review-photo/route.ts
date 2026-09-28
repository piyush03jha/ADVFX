import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(
    getBackendApiUrl(`products/${encodeURIComponent(id)}/review-photo`),
    {
      method: "POST",
      headers: {\n        Authorization: `Bearer ${token}`,\n        "Content-Type": request.headers.get("content-type") ?? "",\n      },
      body: await request.arrayBuffer(),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => null);
  return NextResponse.json(data ?? { error: "Unable to upload review photo." }, {
    status: response.status,
  });
}
