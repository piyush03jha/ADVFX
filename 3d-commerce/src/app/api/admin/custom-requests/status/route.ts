import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/app/api/auth/admin/login/route";
import { getBackendApiUrl } from "@/lib/backend-api";

export async function PATCH(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!body?.id || !body.status) {
    return NextResponse.json({ error: "Request id and status are required." }, { status: 400 });
  }
  try {
    const response = await fetch(
      getBackendApiUrl("custom-requests/admin/" + encodeURIComponent(body.id) + "/status"),
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: body.status }),
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Unable to update custom request." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Admin service is unavailable." }, { status: 503 });
  }
}