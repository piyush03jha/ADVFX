import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const user = token ? verifySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
