import { NextResponse } from "next/server";

import { createSessionToken, AUTH_COOKIE_NAME, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/auth-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const record = findUserByEmail(email);
    if (!record || !verifyPassword(password, record.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({ user: record.user });
    response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(record.user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
