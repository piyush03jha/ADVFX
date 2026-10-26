/**
 * Resolve media URLs returned by the API to a URL the storefront can load.
 *
 * Local storage is exposed through the Next.js /storage proxy. Production product
 * objects are served directly by the API asset endpoint: routing every image back
 * through the storefront Worker adds an unnecessary second hop and can turn a
 * healthy B2 response into a Cloudflare 502.
 */
const PRODUCTION_PRODUCT_ASSET_ORIGIN = "https://api.voxel3d.org";

function productAssetOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_ASSET_BASE_URL
    ?.trim()
    .replace(/\/$/, "");

  if (configured) {
    try {
      const url = new URL(configured);
      // assets.voxel3d.org was retired; do not send new requests to it.
      return url.hostname === "assets.voxel3d.org"
        ? PRODUCTION_PRODUCT_ASSET_ORIGIN
        : url.origin;
    } catch {
      // Fall through to the production default below.
    }
  }

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_PRODUCT_ASSET_ORIGIN
    : null;
}

function directProductAssetUrl(storageKey: string, suffix = ""): string | null {
  const origin = productAssetOrigin();
  if (!origin || !storageKey.startsWith("products/")) return null;

  return `${origin}/${storageKey.split("/").map(encodeURIComponent).join("/")}${suffix}`;
}

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
        const storageKey = parsed.pathname.slice("/storage/".length);
        const directUrl = directProductAssetUrl(
          storageKey,
          parsed.search + parsed.hash,
        );
        if (directUrl) return directUrl;
        const namespace = storageKey.split("/")[0];
        if (["products", "categories", "custom-build-categories", "custom-build-options"].includes(namespace)) {
          return "/api/assets/" + storageKey + parsed.search + parsed.hash;
        }
        return parsed.pathname + parsed.search + parsed.hash;
      }

      // Category images created before the private B2 asset proxy used
      // assets.voxel3d.org. Resolve those legacy URLs through the current
      // same-origin asset proxy instead of sending the browser to the old
      // hostname.
      if (
        (parsed.hostname === "assets.voxel3d.org" ||
          parsed.hostname === "api.voxel3d.org") &&
        parsed.pathname.startsWith("/products/")
      ) {
        // api.voxel3d.org serves these B2-backed objects directly. Keeping the
        // URL avoids the storefront Worker proxy, which is not required for
        // public product images and has intermittently returned 502 responses.
        if (parsed.hostname === "api.voxel3d.org") return raw;
        const directUrl = directProductAssetUrl(
          parsed.pathname.slice(1),
          parsed.search + parsed.hash,
        );
        if (directUrl) return directUrl;
      }

      if (
        (parsed.hostname === "assets.voxel3d.org" ||
          parsed.hostname === "api.voxel3d.org") &&
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
        const directUrl = directProductAssetUrl(
          parsed.pathname.slice("/api/assets/".length),
          parsed.search + parsed.hash,
        );
        if (directUrl) return directUrl;
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // Keep malformed/unknown URLs unchanged so the browser can report them.
    }

    return raw;
  }

  if (raw.startsWith("/storage/") || raw.startsWith("storage/")) {
    const path = raw.startsWith("/") ? raw.slice(1) : raw;
    const storageKey = path.slice("storage/".length);
    const directUrl = directProductAssetUrl(storageKey);
    if (directUrl) return directUrl;
    const namespace = storageKey.split("/")[0];
    if (["products", "categories", "custom-build-categories", "custom-build-options"].includes(namespace)) {
      return "/api/assets/" + storageKey;
    }
    return "/" + path;
  }

  // Normalize legacy relative asset paths saved before the API asset proxy
  // became canonical. Without this, a product detail page can request
  // /products/... or /categories/... from the storefront instead of the API.
  if (raw.startsWith("/products/")) {
    return directProductAssetUrl(raw.slice(1)) ?? "/api/assets" + raw;
  }
  if (raw.startsWith("products/")) {
    return directProductAssetUrl(raw) ?? "/api/assets/" + raw;
  }
  if (raw.startsWith("/categories/")) {
    return "/api/assets" + raw;
  }
  if (raw.startsWith("categories/")) {
    return "/api/assets/" + raw; 
  }

  if (raw.startsWith("/api/assets/products/")) {
    return directProductAssetUrl(raw.slice("/api/assets/".length)) ?? raw;
  }

  return raw.startsWith("/") ? raw : "/" + raw;
}
