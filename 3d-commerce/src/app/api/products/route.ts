import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  try {
    const response = await fetch(getBackendApiUrl("products"), { cache: "no-store" });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to load products." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const response = await fetch(getBackendApiUrl("products"), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to create product." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Catalog service is unavailable." }, { status: 503 });
  }
}