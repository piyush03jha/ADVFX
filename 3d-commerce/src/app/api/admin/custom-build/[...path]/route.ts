import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: Request, context: Context) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const backendPath = [
    "custom-requests/admin/config",
    ...path.map((part) => encodeURIComponent(part)),
  ].join("/");

  try {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);

    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);

    let body: ArrayBuffer | undefined;
    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
      body = await request.arrayBuffer();
    }

    const response = await fetch(getBackendApiUrl(backendPath), {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseType = response.headers.get("content-type") ?? "";
    if (responseType.includes("application/json")) {
      return NextResponse.json(await response.json(), { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseType
        ? { "Content-Type": responseType }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Custom configuration service is unavailable." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
