
const DEFAULT_BACKEND_API_URL = "http://localhost:4000";

export function getBackendApiUrl(path: string) {
  const configured = process.env.BACKEND_API_URL;

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error(
      "BACKEND_API_URL is not configured. Refusing to fall back to localhost in production.",
    );
  }

  const baseUrl = configured ?? DEFAULT_BACKEND_API_URL;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/**
 * Forward the browser IP only as an authenticated assertion. The API ignores
 * ordinary X-Forwarded-For / CF-Connecting-IP headers and verifies this HMAC,
 * so a direct request to Railway cannot choose its own rate-limit identity.
 */
export async function getTrustedClientIpHeaders(request: Request): Promise<Record<string, string>> {
  const secret = process.env.INTERNAL_PROXY_SECRET?.trim();
  if (!secret || secret.length < 32) return {};

  const forwardedIp =
    request.headers.get("cf-connecting-ip") ??
    (process.env.NODE_ENV === "development"
      ? request.headers.get("x-real-ip")
      : null);
  const ip = forwardedIp?.trim() ?? "";
  if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip) || (!ip.includes(".") && !ip.includes(":"))) return {};

  const timestamp = String(Math.floor(Date.now() / 1000));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${ip}.${timestamp}`),
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return {
    "x-voxel-client-ip": ip,
    "x-voxel-client-ip-ts": timestamp,
    "x-voxel-client-ip-signature": signature,
  };
}
