import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

async function forward(request: NextRequest, path: string) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const response = await fetch(getBackendApiUrl(path), {
      method: request.method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "3D conversion service is unavailable." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return forward(request, "3d-conversion");
}

export async function POST(request: NextRequest) {
  return forward(request, "3d-conversion/upload");
}
