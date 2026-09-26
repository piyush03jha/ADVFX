import { NextRequest } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { path } = await context.params;

  if (!path?.length) {
    return new Response("Not Found", { status: 404 });
  }

  const storagePath = path
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const backendUrl = getBackendApiUrl(\`storage/\${storagePath}\`);

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response("Storage file not found", {
        status: response.status,
      });
    }

    const headers = new Headers();

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const cacheControl = response.headers.get("cache-control");

    if (contentType) headers.set("Content-Type", contentType);
    if (contentLength) headers.set("Content-Length", contentLength);
    if (cacheControl) headers.set("Cache-Control", cacheControl);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return new Response("Storage service is unavailable", {
      status: 503,
    });
  }
}
