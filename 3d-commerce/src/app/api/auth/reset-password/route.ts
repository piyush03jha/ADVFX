import { NextResponse } from "next/server";

import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password ?? "";

    if (!token || token.length > 256 || password.length < 8) {
      return NextResponse.json(
        { error: "A valid reset token and password of at least 8 characters are required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      message?: string | string[];
    };

    const message = Array.isArray(data.message) ? data.message[0] : data.message;

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: message ?? "This password reset link is invalid or expired." },
        { status: backendResponse.status || 502 },
      );
    }

    return NextResponse.json({ message: message ?? "Password reset successfully." });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
