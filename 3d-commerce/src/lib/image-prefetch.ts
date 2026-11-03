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
 * Called the moment a visitor chooses a product (pointer down / click): start the
 * product's photos and its 3D file so they are already on their way when the product
 * page opens. The model download is shared with the viewer, so it is never fetched twice.
 */
export function prefetchProductMedia(product: ProductMedia) {
  if (typeof window === "undefined") return;
  const photos = [product.image, ...(product.images ?? [])].map((value) => resolveMediaUrl(value));
  prefetchImages(photos);

  const model = product.model?.trim();
  if (model && !saveData()) void loadModelBuffer(model).catch(() => undefined);
}
