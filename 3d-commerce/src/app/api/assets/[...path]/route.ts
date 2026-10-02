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
    path.length < 2 ||
    path.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  try {
    const backendPath = path.map(encodeURIComponent).join("/");
    const response = await fetch(
      getBackendApiUrl(`assets/products/${backendPath}`),
      { cache: "no-store" },
    );

    return new NextResponse(response.body, {
      status: response.status,
      headers: copyAssetHeaders(response),
    });
  } catch {
    return NextResponse.json(
      { error: "Asset service is unavailable." },
      { status: 503 },
    );
  }
}