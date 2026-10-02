import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/backend-api";

function copyAssetHeaders(response: Response) {
  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "cache-control",
    "content-disposition",
    "etag",
    "last-modified",
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  if (
    !Array.isArray(path) ||
    path.length < 3 ||
    path[0] !== "products" ||
    path.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  try {
    // The public URL already contains the "products" namespace. The backend
    // controller owns that route prefix, so only forward the product id/key.
    const backendPath = path.slice(1).map(encodeURIComponent).join("/");
    const response = await fetch(
      getBackendApiUrl(`assets/products/${backendPath}`),
      { next: { revalidate: 3600 } },
    );

    const headers = copyAssetHeaders(response);
    if (!headers.has("cache-control") && response.ok) {
      headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Asset service is unavailable." },
      { status: 503 },
    );
  }
}
