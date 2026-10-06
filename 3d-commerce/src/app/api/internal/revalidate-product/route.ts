import { NextResponse } from "next/server";
import { revalidateProductCatalog } from "@/lib/revalidate-catalog";

export async function POST(request: Request) {
  const expected = process.env.CATALOG_REVALIDATE_SECRET?.trim();
  const provided = request.headers.get("x-catalog-revalidate-secret")?.trim();

  if (!expected || !provided || provided !== expected) {
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
