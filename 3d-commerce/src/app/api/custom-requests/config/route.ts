import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl, backendFetch } from "@/lib/backend-api";

export async function GET() {
  try { const r=await backendFetch(getBackendApiUrl("custom-requests/config"),{cache:"no-store"}); return NextResponse.json(await r.json(),{status:r.status}); }
  catch { return NextResponse.json({error:"Custom configuration service is unavailable."},{status:503}); }
}
