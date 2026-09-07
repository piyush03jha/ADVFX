import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
      developmentOnly: data.developmentOnly,
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
