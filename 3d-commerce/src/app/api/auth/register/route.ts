import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, createPasswordHash, createSessionToken } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/auth-store";

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

    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = createUser({ name, email, passwordHash: createPasswordHash(password) });
    const response = NextResponse.json({ user }, { status: 201 });

    response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to create your account." }, { status: 500 });
  }
}
