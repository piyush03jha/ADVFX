import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
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