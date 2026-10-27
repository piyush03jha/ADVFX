import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl, getTrustedClientIpHeaders, backendFetch } from "@/lib/backend-api";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_COOKIE_PATH,
  getGoogleOAuthConfig,
  getSafeReturnPath,
  parseGoogleOAuthCookie,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  const url = new URL(request.url);
  const origin = config?.origin ?? url.origin;
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { path: GOOGLE_OAUTH_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  if (!config) return fail("google_unavailable");
  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = parseGoogleOAuthCookie((await cookies()).get(GOOGLE_OAUTH_COOKIE)?.value);
  if (!code || !state || !saved || saved.state !== state) return fail("google_failed");

  try {
    const backendResponse = await backendFetch(getBackendApiUrl("auth/google"), {
      method: "POST",
      headers: { ...(await getTrustedClientIpHeaders(request)), "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier: saved.verifier }),
      cache: "no-store",
    });
    const data = (await backendResponse.json().catch(() => ({}))) as {
      token?: string;
      user?: { id: string; email: string };
    };
    if (!backendResponse.ok || !data.token || !data.user) return fail("google_failed");

    const response = NextResponse.redirect(new URL(getSafeReturnPath(saved.returnTo), origin));
    response.cookies.set(AUTH_COOKIE_NAME, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { path: GOOGLE_OAUTH_COOKIE_PATH, maxAge: 0 });
    return response;
  } catch {
    return fail("google_failed");
  }
}
