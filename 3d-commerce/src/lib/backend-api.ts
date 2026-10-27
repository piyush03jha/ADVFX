
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

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
// Errors raised before a connection was established: the backend cannot have
// processed the request, so replaying is safe for every HTTP method.
const CONNECT_FAILURE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

export type BackendFetchInit = RequestInit & {
  /** Abort if response headers have not arrived within this time. */
  timeoutMs?: number;
  /**
   * Also replay non-GET requests after a dropped connection (for example a
   * stale keep-alive socket). Only set this when a duplicate request is harmless.
   */
  retryUnsafe?: boolean;
};

function errorCode(error: unknown): string {
  const withCode = error as { code?: string; cause?: { code?: string } } | null;
  return (
    withCode?.cause?.code ??
    withCode?.code ??
    (error instanceof Error ? error.name : "unknown")
  );
}

function isReplayableBody(body: BodyInit | null | undefined) {
  return (
    body == null ||
    typeof body === "string" ||
    body instanceof URLSearchParams ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

function pause(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, 250 * attempt + Math.random() * 150));
}

/**
 * fetch() for calls from the Next.js server to the API. Adds a timeout so a
 * stuck connection cannot hang forever, retries transient failures (dropped
 * keep-alive sockets, API restarts, 502/503/504), and logs the real cause that
 * the route handlers otherwise swallow behind a generic 503.
 */
export async function backendFetch(url: string, init: BackendFetchInit = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retryUnsafe = false, signal: callerSignal, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  const maxAttempts = isReplayableBody(rest.body) ? MAX_ATTEMPTS : 1;
  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const controller = new AbortController();
    const onCallerAbort = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    else callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { ...rest, signal: controller.signal });
      // Headers arrived; do not cut off a streaming body (model downloads).
      clearTimeout(timer);
      if (idempotent && RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
        await response.body?.cancel().catch(() => undefined);
        await pause(attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (callerSignal?.aborted) throw error;
      const replaySafe =
        idempotent || CONNECT_FAILURE_CODES.has(errorCode(error)) || (retryUnsafe && !timedOut);
      if (!replaySafe || attempt >= maxAttempts) break;
      await pause(attempt);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }
  }

  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // Keep the raw value; it contains no credentials.
  }
  console.error(
    `[backendFetch] ${method} ${path} failed after ${attempts} attempt(s): ${errorCode(lastError)}`,
  );
  throw lastError;
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
