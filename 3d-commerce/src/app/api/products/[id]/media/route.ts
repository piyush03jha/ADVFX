import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const { id } = await context.params;

  try {
    const response = await backendFetch(getBackendApiUrl("products/" + encodeURIComponent(id) + "/media"), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      revalidateProductCatalog(id);
    }

    return NextResponse.json(
      data ?? { error: "Media operation failed." },
      { status: response.status },
    );
 } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}