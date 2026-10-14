// Server-side helpers for the Google OAuth 2.0 authorization-code + PKCE flow.
// Web Crypto keeps this compatible with Cloudflare Workers and Node.

export const GOOGLE_OAUTH_COOKIE = "forma_google_oauth";
export const GOOGLE_OAUTH_COOKIE_PATH = "/api/auth/google";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

export type GoogleOAuthConfig = {
  clientId: string;
  redirectUri: string;
  origin: string;
};

export type GoogleOAuthCookie = {
  state: string;
  verifier: string;
  returnTo: string;
};

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) return null;
  try {
    return { clientId, redirectUri, origin: new URL(redirectUri).origin };
  } catch {
    return null;
  }
}

export function getSafeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.includes("\\")) {
    return "/account";
  }
  return value;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomUrlSafe(byteLength: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function parseGoogleOAuthCookie(raw: string | undefined): GoogleOAuthCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthCookie>;
    if (typeof parsed.state === "string" && typeof parsed.verifier === "string" && typeof parsed.returnTo === "string") {
      return { state: parsed.state, verifier: parsed.verifier, returnTo: parsed.returnTo };
    }
  } catch {
    // Ignore malformed handshake cookies.
  }
  return null;
}
