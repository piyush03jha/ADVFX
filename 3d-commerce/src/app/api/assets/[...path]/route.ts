import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getBackendApiUrl, getTrustedClientIpHeaders } from "@/lib/backend-api";

function copyAssetHeaders(response: Response) {
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
    "content-range",
    "content-length",
    "accept-ranges",
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
    // Legacy product assets can be one segment deep; every other namespace
    // is <namespace>/<id>/<file>.
    path.length < (path[0] === "products" ? 2 : 3) ||
    !["products", "categories", "custom-build-categories", "custom-build-options"].includes(path[0]) ||
    path.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheUrl = new URL(request.url);
  // Asset routes do not use query parameters to select representations. Avoid
  // cache fragmentation/bypass from arbitrary cache-busting query strings.
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString());
  const range = request.headers.get("range");

  // Range responses are representation-specific (206 + Content-Range). Never
  // satisfy them from, or store them in, the full-object Cache API entry.
  if (!range) {
    const hit = await cache?.match(cacheKey);
    if (hit) return hit;
  }

  try {
    const namespace = path[0];
    const backendPath = path.slice(1).map(encodeURIComponent).join("/");
    const backendHeaders = new Headers(await getTrustedClientIpHeaders(request));
    if (range) backendHeaders.set("range", range);

    const response = await fetch(
      getBackendApiUrl(`assets/${namespace}/${backendPath}`),
      { cache: "no-store", headers: backendHeaders },
    );

    const headers = copyAssetHeaders(response);
    if (!response.ok || !response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    }

    const isImmutableGlb =
      path[path.length - 1]?.toLowerCase().endsWith(".glb") ||
      response.headers.get("content-type") === "model/gltf-binary";

    headers.set(
      "cache-control",
      isImmutableGlb
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400",
    );

    const out = new Response(response.body, {
      status: response.status,
      headers,
    });

    // Cloudflare Cache API does not use partial 206 responses as reusable
    // full-object entries. Only cache complete responses.
    if (cache && !range && response.status === 200) {
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
