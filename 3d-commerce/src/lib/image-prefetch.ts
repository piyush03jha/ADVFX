import { resolveMediaUrl } from "@/lib/media-url";

const requested = new Set<string>();

// Only URLs the pages render as-is (API/proxy/absolute). Local static files go through
// Next's image optimizer with different URLs, so warming them here would not help.
const isDirect = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/api/assets/");

/** Ask the browser to download images now so they are in its cache when the page shows them. */
export function prefetchImages(urls: ReadonlyArray<string | null | undefined>) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || requested.has(url) || !isDirect(url)) continue;
    requested.add(url);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }
}

type ProductMedia = { image?: string | null; images?: string[] | null; model?: string | null };

/**
 * Warm a product's photos. Cheap, so it is fine on pointer down (including the start of
 * a swipe on a phone).
 */
export function prefetchProductPhotos(product: ProductMedia) {
  if (typeof window === "undefined") return;
  prefetchImages([product.image, ...(product.images ?? [])].map((value) => resolveMediaUrl(value)));
}

/** Warm photos only; model downloads start when the 3D tab opens. */
export function prefetchProductMedia(product: ProductMedia) {
  if (typeof window === "undefined") return;
  prefetchProductPhotos(product);
}
