import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";
function isSafeRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}


interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { requestId } = await params;

  try {
    const response = await fetch(
      getBackendApiUrl(`custom-requests/${encodeURIComponent(requestId)}/files`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": request.headers.get("content-type") ?? "multipart/form-data",
        },
        body: request.body,
        // @ts-expect-error Next.js server fetch supports streamed request bodies.
        duplex: "half",
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);
    return NextResponse.json(
      data ?? { error: "Unable to upload reference." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Custom upload service is unavailable." },
      { status: 503 },
    );
  }
}