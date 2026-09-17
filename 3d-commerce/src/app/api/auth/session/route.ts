import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

type BackendUser = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const backendResponse = await fetch(getBackendApiUrl("auth/session"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    const data = (await backendResponse.json()) as BackendUser & {
      user?: BackendUser | null;
    };

    // The customer backend session endpoint returns the user directly,
    // whereas some auth endpoints return { user }. Support both shapes.
    const backendUser = data.user ?? data;

    if (!backendUser?.id || !backendUser.email) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      user: {
        id: backendUser.id,
        name: backendUser.name ?? "",
        email: backendUser.email,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 503 });
  }
}
