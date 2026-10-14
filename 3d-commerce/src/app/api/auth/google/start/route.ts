import { NextResponse } from "next/server";

import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  GOOGLE_OAUTH_COOKIE_PATH,
  getGoogleOAuthConfig,
  getSafeReturnPath,
  pkceChallenge,
  randomUrlSafe,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  const url = new URL(request.url);
  if (!config) return NextResponse.redirect(new URL("/login?error=google_unavailable", url.origin));

  const returnTo = getSafeReturnPath(url.searchParams.get("returnTo"));
  const state = randomUrlSafe(32);
  const verifier = randomUrlSafe(48);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, verifier, returnTo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: GOOGLE_OAUTH_COOKIE_PATH,
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
