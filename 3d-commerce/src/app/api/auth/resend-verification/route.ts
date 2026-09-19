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
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/resend-verification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      message?: string | string[];
      developmentOnly?: { emailVerificationToken?: string };
      emailDeliveryPending?: boolean;
    };

    const message = Array.isArray(data.message) ? data.message[0] : data.message;

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: message ?? "Unable to resend the verification email." },
        { status: backendResponse.status || 502 },
      );
    }

    return NextResponse.json({
      message: message ?? "If the account exists and is not verified, a verification email has been sent.",
      ...(process.env.NODE_ENV !== "production" && data.developmentOnly ? { developmentOnly: data.developmentOnly } : {}),
      emailDeliveryPending: data.emailDeliveryPending ?? false,
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
