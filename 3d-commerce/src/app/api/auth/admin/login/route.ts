import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/backend-api";

export const ADMIN_COOKIE = "forma_admin_session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) return NextResponse.json({ error: "Email and admin password are required." }, { status: 400 });

    const response = await fetch(getBackendApiUrl("auth/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null) as { token?: string; user?: { id:string; name:string|null; email:string; role:string }; message?: string|string[] };
    if (!response.ok || !data.token || !data.user) {
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
      return NextResponse.json({ error: message ?? "Unable to sign in as admin." }, { status: response.status || 502 });
    }
    const result = NextResponse.json({ user: data.user });
    result.cookies.set(ADMIN_COOKIE, data.token, { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", path:"/", maxAge:60*60*12 });
    return result;
  } catch {
    return NextResponse.json({ error:"Admin authentication service is unavailable." }, { status:503 });
  }
}