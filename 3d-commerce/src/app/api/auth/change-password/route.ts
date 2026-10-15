import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
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

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (
      typeof body.currentPassword !== "string" ||
      body.currentPassword.length === 0 ||
      body.currentPassword.length > 128 ||
      typeof body.newPassword !== "string" ||
      body.newPassword.length < 12 ||
      body.newPassword.length > 128
    ) {
      return NextResponse.json(
        { error: "Enter your current password and a new password of at least 12 characters." },
        { status: 400 },
      );
    }

    const response = await fetch(getBackendApiUrl("auth/change-password"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
      error?: string;
    } | null;
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? message ?? "Unable to update password." },
        { status: response.status },
      );
    }

    return NextResponse.json({
      message: message ?? "Password updated successfully.",
    }, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
