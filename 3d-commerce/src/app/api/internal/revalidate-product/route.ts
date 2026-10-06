import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(request: Request) {
  const expected = process.env.CATALOG_REVALIDATE_SECRET?.trim();
  const provided = request.headers.get("x-catalog-revalidate-secret")?.trim();

  const expectedBuffer = Buffer.from(expected ?? "");
  const providedBuffer = Buffer.from(provided ?? "");
  const validSecret =
    expectedBuffer.length > 0 &&
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);

  if (!validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { productId?: string } | null;
  const productId = body?.productId?.trim();

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  revalidateProductCatalog(productId);
  return NextResponse.json({ revalidated: true, productId });
}
