import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

interface RouteContext {
  params: Promise<{ requestId: string; fileId: string }>;
}

/**
 * Admin-only stream proxy for private customer references. The browser never
 * receives the B2 storage key or an access token, and the backend checks the
 * admin role and the request/file relationship independently.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }

  const { requestId, fileId } = await params;
  if (!requestId || !fileId) {
    return NextResponse.json({ error: "Request and file IDs are required." }, { status: 400 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";

  try {
    const path =
      `custom-requests/${encodeURIComponent(requestId)}/files/${encodeURIComponent(fileId)}` +
      (download ? "?download=1" : "");
    const upstream = await fetch(getBackendApiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const data = (await upstream.json().catch(() => null)) as
        | { message?: string | string[]; error?: string }
        | null;
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
      return NextResponse.json(
        { error: message ?? data?.error ?? "Unable to access the customer file." },
        { status: upstream.status },
      );
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-type", "content-disposition", "content-length"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "The file service is unavailable. Please retry." },
      { status: 503 },
    );
  }
}
