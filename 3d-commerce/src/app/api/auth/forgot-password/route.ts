import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";
function isSafeRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}


export async function POST(request: Request) {
  if (!isSafeRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { email?: string; captchaToken?: string; captchaAnswer?: string };
    const email = body.email?.trim().toLowerCase();
    const captchaToken = body.captchaToken?.trim() ?? "";
    const captchaAnswer = body.captchaAnswer?.trim() ?? "";

    if (!email || !captchaToken) {
      return NextResponse.json({ error: "Email address and security verification are required." }, { status: 400 });
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captchaToken, captchaAnswer }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      message?: string | string[];
      developmentOnly?: { passwordResetToken?: string };
    };

    const message = Array.isArray(data.message) ? data.message[0] : data.message;

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: message ?? "Unable to request a password reset." },
        { status: backendResponse.status || 502 },
      );
    }

    return NextResponse.json({
      message: message ?? "If the account exists, password reset instructions have been sent.",
      ...(process.env.NODE_ENV !== "production" ? { developmentOnly: data.developmentOnly } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
