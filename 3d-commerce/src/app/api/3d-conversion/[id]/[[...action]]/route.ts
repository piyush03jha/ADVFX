import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

async function getToken() {
  return (await cookies()).get(ADMIN_COOKIE)?.value;
}

async function proxy(request: NextRequest, path: string) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  try {
    const hasBodyMethod = request.method !== "GET" && request.method !== "HEAD";
    const bodyText = hasBodyMethod ? await request.text() : "";

    const response = await fetch(getBackendApiUrl(path), {
      method: request.method,
      headers: {
        Authorization: "Bearer " + token,
        ...(bodyText ? { "Content-Type": "application/json" } : {}),
      },
      body: bodyText || undefined,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "application/json";
    const responseText = contentType.includes("application/json")
      ? await response.text()
      : null;

    if (request.method === "POST" && path.endsWith("/publish") && response.ok && responseText) {
      try {
        const published = JSON.parse(responseText) as { targetProductId?: string };
        if (published.targetProductId) revalidateProductCatalog(published.targetProductId);
      } catch {
        // The backend response is still returned to the admin UI even if
        // catalog revalidation cannot be performed.
      }
    }

    if (contentType.includes("application/octet-stream") || contentType.includes("model/gltf-binary")) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": response.headers.get("content-disposition") ?? "attachment",
          ...(response.headers.get("content-length") ? { "Content-Length": response.headers.get("content-length")! } : {}),
        },
      });
    }

    return new NextResponse(responseText ?? "", {
      status: response.status,
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "3D conversion service is unavailable." }, { status: 503 });
  }
}

type Context = { params: Promise<{ id: string; action?: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  const { id, action = [] } = await context.params;
  return proxy(request, "3d-conversion/" + encodeURIComponent(id) + (action.length ? "/" + action.join("/") : ""));
}

export async function POST(request: NextRequest, context: Context) {
  const { id, action = [] } = await context.params;
  return proxy(request, "3d-conversion/" + encodeURIComponent(id) + (action.length ? "/" + action.join("/") : ""));
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id, action = [] } = await context.params;
  return proxy(request, "3d-conversion/" + encodeURIComponent(id) + (action.length ? "/" + action.join("/") : ""));
}
