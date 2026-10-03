import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET(request: Request) {
  const purpose = new URL(request.url).searchParams.get("purpose");
  if (purpose !== "login" && purpose !== "register" && purpose !== "forgot-password") {
    return NextResponse.json({ error: "A valid CAPTCHA purpose is required." }, { status: 400 });
  }

  try {
    const response = await fetch(getBackendApiUrl(`auth/captcha?purpose=${purpose}`), { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.message ?? "Unable to prepare CAPTCHA." }, { status: response.status });
    }
    if (data.provider !== "turnstile") return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

    const siteKey = (typeof data.siteKey === "string" ? data.siteKey.trim() : "") ||
      process.env.TURNSTILE_SITE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

    if (!siteKey) {
      return NextResponse.json({ error: "Security check is not configured. Please contact support." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ...data, siteKey }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Authentication service is unavailable. Please try again." }, { status: 503 });
  }
}