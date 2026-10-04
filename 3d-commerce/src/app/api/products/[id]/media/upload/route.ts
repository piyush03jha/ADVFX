import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await context.params;

  try {
    const headers: Record<string,string> = { Authorization: "Bearer " + token };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const upstreamRequest = {
      method: "POST",
      headers,
      body: request.body,
      // Keep image uploads streaming through the Cloudflare Worker.
      duplex: "half",
      cache: "no-store",
    } as RequestInit & { duplex: "half" };

    const response = await fetch(
      getBackendApiUrl("products/" + encodeURIComponent(id) + "/media/upload"),
      upstreamRequest,
    );
    const data = await response.json().catch(() => null);

    if (response.ok) {
      revalidateProductCatalog(id);
    }

    return NextResponse.json(data ?? { error: "Image upload failed." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}
