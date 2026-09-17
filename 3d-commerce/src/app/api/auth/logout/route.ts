import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function POST() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      await fetch(getBackendApiUrl("auth/customer/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }
  } finally {
    const response = NextResponse.json({ ok: true });

    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}
