import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/backend-api";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await context.params;
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const response = await fetch(
    getBackendApiUrl(
      `products/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}/download`,
    ),
    { headers, cache: "no-store" },
  );

  const outHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length", "cache-control"]) {
    const value = response.headers.get(name);
    if (value) outHeaders.set(name, value);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: outHeaders,
  });
}
