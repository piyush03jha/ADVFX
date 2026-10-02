import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET(request: NextRequest) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  try {
    const qs = request.nextUrl.searchParams.toString();
    const response = await fetch(
      `${getBackendApiUrl("admin/audit-logs")}${qs ? `?${qs}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    return new NextResponse(await response.text(), {
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
