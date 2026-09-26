import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function DELETE(request: Request, context: { params: Promise<{ id: string; mediaId: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id, mediaId } = await context.params;

  try {
    const response = await fetch(getBackendApiUrl("products/" + encodeURIComponent(id) + "/media/" + encodeURIComponent(mediaId)), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Media deletion failed." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}