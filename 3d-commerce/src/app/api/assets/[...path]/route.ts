import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBackendApiUrl } from "@/lib/backend-api";

function copyAssetHeaders(response: Response) {
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  if (
    !Array.isArray(path) ||
    path.length < 3 ||
    !["products", "categories"].includes(path[0]) ||
    path.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(new URL(request.url).toString());
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  try {
    const namespace = path[0];
    const backendPath = path.slice(1).map(encodeURIComponent).join("/");
    const response = await fetch(
      getBackendApiUrl(`assets/${namespace}/${backendPath}`),
      { cache: "no-store" },
    );

    const headers = copyAssetHeaders(response);
    if (!response.ok || !response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    }

    headers.set(
      "cache-control",
      "public, max-age=31536000, immutable",
    );

    const out = new Response(response.body, {
      status: 200,
      headers,
    });

    if (cache) {
      getCloudflareContext().ctx.waitUntil(cache.put(cacheKey, out.clone()));
    }

    return out;
  } catch {
    return NextResponse.json(
      { error: "Asset service is unavailable." },
      { status: 503 },
    );
  }
}
