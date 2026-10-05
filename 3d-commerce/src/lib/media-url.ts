/**
 * Resolve catalog media URLs to storefront-safe URLs.
 *
 * The storefront has a cacheable same-origin /api/assets proxy. When the API
 * returns an absolute API URL for one of those assets, normalize it back to
 * the proxy so Next/Image, crawlers, and browsers all use the same origin.
 */
export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);

    if (parsed.pathname.startsWith("/api/assets/")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }

    if (parsed.pathname.startsWith("/storage/")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }

    return raw;
  } catch {
    if (raw.startsWith("/api/assets/") || raw.startsWith("/storage/")) return raw;
    if (raw.startsWith("api/assets/") || raw.startsWith("storage/")) return "/" + raw;
    return raw.startsWith("/") ? raw : "/" + raw;
  }
}
