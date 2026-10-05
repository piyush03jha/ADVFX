/**
 * Resolve media URLs returned by the API to a URL the storefront can load.
 *
 * Local storage is exposed through the Next.js /storage proxy. If the API
 * returns an absolute backend URL (for example http://localhost:4000/storage/...),
 * keep the storage key but serve it from the current storefront origin instead.
 */
export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("https://") ||
    raw.startsWith("http://")
  ) {
    try {
      const parsed = new URL(raw);

      if (parsed.pathname.startsWith("/storage/")) {
        return parsed.pathname + parsed.search + parsed.hash;
      }

      // Category images created before the private B2 asset proxy used
      // assets.voxel3d.org. Resolve those legacy URLs through the current
      // same-origin asset proxy instead of sending the browser to the old
      // hostname.
      if (
        parsed.hostname === "assets.voxel3d.org" &&
        parsed.pathname.startsWith("/categories/")
      ) {
        return (
          "/api/assets" +
          parsed.pathname +
          parsed.search +
          parsed.hash
        );
      }

      // Also normalize legacy absolute API asset URLs to the storefront
      // proxy so the browser uses one consistent asset path.
      if (
        parsed.hostname === "api.voxel3d.org" &&
        parsed.pathname.startsWith("/api/assets/")
      ) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // Keep malformed/unknown URLs unchanged so the browser can report them.
    }

    return raw;
  }

  if (raw.startsWith("/storage/")) return raw;
  if (raw.startsWith("storage/")) return "/" + raw;

  return raw.startsWith("/") ? raw : "/" + raw;
}
