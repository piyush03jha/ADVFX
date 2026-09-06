import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { error: "Enter your name, a valid email, and a password of at least 8 characters." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      token?: string;
      user?: { id: string; name: string | null; email: string; role?: string };
      message?: string | string[];
    };

    if (!backendResponse.ok || !data.token || !data.user) {
      const message = Array.isArray(data.message) ? data.message[0] : data.message;
      return NextResponse.json(
        { error: message ?? "Unable to create your account." },
        { status: backendResponse.status || 502 },
      );
    }

    const response = NextResponse.json(
      {
        user: {
          id: data.user.id,
          name: data.user.name ?? name,
          email: data.user.email,
        },
      },
      { status: 201 },
    );

    response.cookies.set(AUTH_COOKIE_NAME, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
