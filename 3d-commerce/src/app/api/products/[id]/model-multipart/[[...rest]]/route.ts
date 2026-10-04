import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string; rest?: string[] }>;
  },
) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  const { id, rest = [] } = await context.params;

  try {
    const response = await fetch(
      getBackendApiUrl(
        [
          "products",
          encodeURIComponent(id),
          "model-multipart",
          ...rest.map(encodeURIComponent),
        ].join("/"),
      ),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: await request.text(),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => ({}));

    if (response.ok && rest[0] === "complete") {
      revalidateProductCatalog(id);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Upload service is unavailable." },
      { status: 503 },
    );
  }
}
