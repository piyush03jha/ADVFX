import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  try {
    const contentType = request.headers.get("content-type");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const response = await fetch(
      getBackendApiUrl(`categories/${encodeURIComponent(id)}/image`),
      {
        method: "POST",
        headers,
        body: await request.arrayBuffer(),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? { error: "Category image upload failed." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Category service is unavailable." },
      { status: 503 },
    );
  }
}
