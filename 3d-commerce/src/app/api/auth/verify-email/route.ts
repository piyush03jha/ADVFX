import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token || token.length > 256) {
      return NextResponse.json(
        { error: "A valid verification token is required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/verify-email"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      message?: string | string[];
    };

    if (!backendResponse.ok) {
      const message = Array.isArray(data.message) ? data.message[0] : data.message;
      return NextResponse.json(
        { error: message ?? "This verification link is invalid or expired." },
        { status: backendResponse.status || 502 },
      );
    }

    return NextResponse.json({ message: data.message ?? "Email verified successfully." });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
