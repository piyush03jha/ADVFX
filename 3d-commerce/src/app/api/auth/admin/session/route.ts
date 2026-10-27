import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../login/route";
import { backendFetch, getBackendApiUrl } from "@/lib/backend-api";

function signedOut() {
  const response = NextResponse.json({ user: null });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

export async function GET() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const response = await backendFetch(getBackendApiUrl("auth/admin/session"), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });

    // Only an explicit rejection means the session is invalid. A 429/5xx from
    // the API is temporary and must not clear the cookie or look like a logout.
    if (response.status === 401 || response.status === 403) return signedOut();
    if (!response.ok) {
      return NextResponse.json(
        { user: null, error: "Session check is temporarily unavailable." },
        { status: 503 },
      );
    }

    const data = (await response.json().catch(() => null)) as {
      id?: string;
      name?: string | null;
      email?: string;
      role?: string;
    } | null;
    if (data?.role !== "ADMIN" || !data.id || !data.email) return signedOut();
    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json(
      { user: null, error: "Session check is temporarily unavailable." },
      { status: 503 },
    );
  }
}
