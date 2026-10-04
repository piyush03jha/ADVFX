const CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_RETRIES = 5;
const CACHE_NAME = "voxel3d-glb-v1";

const inFlight = new Map<string, Promise<string>>();
const objectUrls = new Map<string, string>();

function cacheRequest(url: string): Request {
  return new Request(url, { method: "GET", cache: "no-store" });
}

async function waitForOnline(signal?: AbortSignal) {
  if (navigator.onLine) return;

  await new Promise<void>((resolve, reject) => {
    const onOnline = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Download cancelled", "AbortError"));
    };
    const cleanup = () => {
      window.removeEventListener("online", onOnline);
      signal?.removeEventListener("abort", onAbort);
    };

    window.addEventListener("online", onOnline, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    await waitForOnline(signal);

    try {
      const response = await fetch(url, {
        ...init,
        signal,
        cache: "no-store",
      });

      if (response.ok) return response;

      if (
        ![408, 425, 429, 500, 502, 503, 504].includes(response.status) ||
        attempt >= MAX_RETRIES
      ) {
        throw new Error(`Model download failed (${response.status})`);
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      if (attempt >= MAX_RETRIES) throw error;
    }

    await new Promise((resolve) =>
      window.setTimeout(
        resolve,
        Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250,
      ),
    );
  }
}

function validateGlbHeader(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 12) {
    throw new Error("GLB header is incomplete");
  }

  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  const version = view.getUint32(4, true);
  const length = view.getUint32(8, true);

  if (magic !== "glTF" || version !== 2) {
    throw new Error("The downloaded file is not a GLB 2.0 model");
  }

  if (length < 12 || length > 1024 * 1024 * 1024) {
    throw new Error("GLB declares an invalid file size");
  }

  return length;
}

async function fetchRange(
  url: string,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Range: `bytes=${start}-${end}`,
        Accept: "model/gltf-binary,application/octet-stream",
      },
    },
    signal,
  );

  if (response.status !== 206) {
    if (start === 0 && response.status === 200) {
      return response.arrayBuffer();
    }

    throw new Error("Asset CDN did not return a byte range");
  }

  const contentRange = response.headers.get("Content-Range") ?? "";
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
  if (!match || Number(match[1]) !== start) {
    throw new Error("Asset CDN returned an invalid byte range");
  }

  return response.arrayBuffer();
}

async function readCachedModel(url: string): Promise<string | null> {
  if (!("caches" in window)) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheRequest(url));

    if (!response) return null;

    const blob = await response.blob();
    if (!blob.size) return null;

    const objectUrl = URL.createObjectURL(blob);
    objectUrls.set(url, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

async function storeModel(
  url: string,
  buffer: ArrayBuffer,
  contentType = "model/gltf-binary",
) {
  if (!("caches" in window)) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      cacheRequest(url),
      new Response(buffer.slice(0), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
  } catch {
    // Browser cache quota is optional; the in-memory object URL remains usable.
  }
}

export async function loadModelBuffer(
  url: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) throw new Error("Model URL is empty");

  const existing = objectUrls.get(normalizedUrl);
  if (existing) {
    onProgress?.(100);
    return existing;
  }

  const running = inFlight.get(normalizedUrl);
  if (running) return running;

  const promise = (async () => {
    const cached = await readCachedModel(normalizedUrl);
    if (cached) {
      onProgress?.(100);
      return cached;
    }

    const header = await fetchRange(normalizedUrl, 0, CHUNK_SIZE - 1, signal);
    const total = validateGlbHeader(header);

    let buffer: ArrayBuffer;

    if (header.byteLength >= total) {
      buffer = header.slice(0, total);
    } else {
      const output = new Uint8Array(total);
      output.set(new Uint8Array(header.slice(0, Math.min(header.byteLength, total))), 0);

      let completed = Math.min(header.byteLength, total);
      onProgress?.(Math.round((completed / total) * 100));

      const ranges: Array<{ start: number; end: number }> = [];
      for (let start = completed; start < total; start += CHUNK_SIZE) {
        ranges.push({
          start,
          end: Math.min(total - 1, start + CHUNK_SIZE - 1),
        });
      }

      let next = 0;
      const workers = Math.min(4, ranges.length);

      await Promise.all(
        Array.from({ length: workers }, async () => {
          while (next < ranges.length) {
            const index = next;
            next += 1;

            const range = ranges[index];
            const chunk = await fetchRange(
              normalizedUrl,
              range.start,
              range.end,
              signal,
            );

            output.set(new Uint8Array(chunk), range.start);
            completed += chunk.byteLength;
            onProgress?.(Math.min(100, Math.round((completed / total) * 100)));
          }
        }),
      );

      buffer = output.buffer;
    }

    validateGlbHeader(buffer);
    await storeModel(normalizedUrl, buffer);

    const blobUrl = URL.createObjectURL(
      new Blob([buffer], { type: "model/gltf-binary" }),
    );
    objectUrls.set(normalizedUrl, blobUrl);
    onProgress?.(100);
    return blobUrl;
  })();

  inFlight.set(normalizedUrl, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(normalizedUrl);
  }
}

export function clearModelCache(url?: string) {
  if (!url) return;

  const objectUrl = objectUrls.get(url);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(url);
  }
}
