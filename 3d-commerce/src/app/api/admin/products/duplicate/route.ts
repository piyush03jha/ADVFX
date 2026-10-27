import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const response = await backendFetch(getBackendApiUrl("admin/products/duplicate"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    });

    const responseText = await response.text();

    // Invalidate cached catalog data only after successful duplication.
    if (response.ok) {
      revalidateProductCatalog();
    }

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Admin service is unavailable." },
      { status: 503 },
    );
  }
}