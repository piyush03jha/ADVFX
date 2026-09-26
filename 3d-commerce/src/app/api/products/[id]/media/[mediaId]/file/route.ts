import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET(request: Request, context: { params: Promise<{ id: string; mediaId: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return new NextResponse("Authentication is required.", { status: 401 });
  const { id, mediaId } = await context.params;

  try {
    const response = await fetch(getBackendApiUrl("products/" + encodeURIComponent(id) + "/media/" + encodeURIComponent(mediaId) + "/file"), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) return new NextResponse(await response.text(), { status: response.status });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Catalog service is unavailable.", { status: 503 });
  }
}