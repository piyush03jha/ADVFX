import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/session"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    const data = (await backendResponse.json()) as {
      user?: { id: string; name: string | null; email: string; role?: string };
    };

    if (!data.user) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        name: data.user.name ?? "",
        email: data.user.email,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 503 });
  }
}
