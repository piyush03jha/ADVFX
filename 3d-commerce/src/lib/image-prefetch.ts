import { loadModelBuffer } from "@/lib/model-loader";
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

function saveData() {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  return Boolean(connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? ""));
}

/**
 * Warm a product's photos. Cheap, so it is fine on pointer down (including the start of
 * a swipe on a phone).
 */
export function prefetchProductPhotos(product: ProductMedia) {
  if (typeof window === "undefined") return;
  prefetchImages([product.image, ...(product.images ?? [])].map((value) => resolveMediaUrl(value)));
}

/**
 * Called when a visitor actually CLICKS a product: start its photos and its 3D file so
 * they are already on their way when the product page opens. The 3D file is tens of MB,
 * so it never starts on hover, pointer down or idle - a swipe past a card must not pay
 * for it. The download is shared with the viewer, so it is never fetched twice.
 * (Hero models are the one exception; the hero loads them itself.)
 */
export function prefetchProductMedia(product: ProductMedia) {
  if (typeof window === "undefined") return;
  prefetchProductPhotos(product);

  const model = product.model?.trim();
  if (model && !saveData()) void loadModelBuffer(model).catch(() => undefined);
}
