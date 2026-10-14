import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getBackendApiUrl } from "@/lib/backend-api";

const STATE_COOKIE = "google_oauth_state";
const VERIFIER_COOKIE = "google_oauth_verifier";
const RETURN_TO_COOKIE = "google_oauth_return_to";
const COOKIE_PATH = "/api/auth/google";

function safeReturnTo(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") && !value.includes("\\")
    ? value
    : "/account";
}

function clearHandshakeCookies(response: NextResponse) {
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE, RETURN_TO_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: COOKIE_PATH,
      maxAge: 0,
    });
  }
  return response;
}

function failure(request: Request, error: string) {
  return clearHandshakeCookies(NextResponse.redirect(new URL(`/login?error=${error}`, request.url)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  const returnTo = safeReturnTo(cookieStore.get(RETURN_TO_COOKIE)?.value);

  if (providerError === "access_denied") return failure(request, "google_denied");
  if (providerError || !code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return failure(request, "google_failed");
  }

  try {
    const backendResponse = await fetch(getBackendApiUrl("auth/google"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
      cache: "no-store",
    });

    const data = (await backendResponse.json()) as {
      token?: string;
      user?: { id: string; name: string | null; email: string };
      message?: string | string[];
    };

    if (!backendResponse.ok || !data.token || !data.user) {
      return failure(request, "google_failed");
    }

    const response = clearHandshakeCookies(NextResponse.redirect(new URL(returnTo, request.url)));
    response.cookies.set(AUTH_COOKIE_NAME, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return failure(request, "google_failed");
  }
}
