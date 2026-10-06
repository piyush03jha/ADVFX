// Shared GLB downloader.
//
// Rules this module enforces:
//  1. One network download per URL, shared by every caller (Hero, product page, ...).
//  2. Each caller can leave (via AbortSignal) without killing a download that
//     someone else still needs. When the LAST caller leaves, the download is
//     aborted for real and its bytes are thrown away.
//  3. An aborted/stale download can never populate the memory or Cache API caches.
//  4. Only a complete, header-validated GLB is ever committed.
//
// Cache note: model URLs are expected to be immutable (unique filename per
// publish), so the browser HTTP cache and the Cache API below are both safe.

const FIRST_REQUEST_BYTES = 12 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_RETRIES = 5;
const MAX_GLB_BYTES = 300 * 1024 * 1024;
const CACHE_NAME = "voxel3d-glb-v3";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

type Entry = {
  controller: AbortController;
  promise: Promise<string>;
  subscribers: number;
  listeners: Set<(percent: number) => void>;
  lastProgress: number;
  settled: boolean;
};

const entries = new Map<string, Entry>();
const objectUrls = new Map<string, string>();

class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`Model download failed (${status})`);
    this.name = "HttpError";
  }
}

function abortError() {
  return new DOMException("Download cancelled", "AbortError");
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForOnline(signal: AbortSignal) {
  if (navigator.onLine) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("online", onOnline);
      signal.removeEventListener("abort", onAbort);
    };
    const onOnline = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    window.addEventListener("online", onOnline, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchWithRetry(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    await waitForOnline(signal);
    try {
      const response = await fetch(url, { ...init, signal });
      if (response.ok) return response;
      throw new HttpError(response.status);
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (error instanceof HttpError && !RETRYABLE_STATUS.has(error.status)) throw error;
      if (attempt >= MAX_RETRIES) throw error;
    }
    await sleep(Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250, signal);
  }
}

function validateGlbHeader(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 12) throw new Error("GLB header is incomplete");

  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const version = view.getUint32(4, true);
  const length = view.getUint32(8, true);

  if (magic !== "glTF" || version !== 2) {
    throw new Error("The downloaded file is not a GLB 2.0 model");
  }
  if (length < 12 || length > MAX_GLB_BYTES) {
    throw new Error("GLB declares an invalid file size");
  }
  return length;
}

async function fetchRange(url: string, start: number, end: number, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetchWithRetry(
    url,
    { headers: { Range: `bytes=${start}-${end}`, Accept: "model/gltf-binary,application/octet-stream" } },
    signal,
  );

  if (response.status !== 206) {
    if (start === 0 && response.status === 200) return response.arrayBuffer();
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
    const response = await cache.match(url);
    if (!response) return null;

    const buffer = await response.arrayBuffer();
    if (validateGlbHeader(buffer) !== buffer.byteLength) {
      await cache.delete(url);
      return null;
    }

    const objectUrl = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
    objectUrls.set(url, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}

async function storeModel(url: string, buffer: ArrayBuffer, signal: AbortSignal) {
  if (!("caches" in window) || signal.aborted) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (signal.aborted) return;
    await cache.put(
      url,
      new Response(buffer.slice(0), {
        headers: {
          "Content-Type": "model/gltf-binary",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
    if (signal.aborted) {
      await cache.delete(url).catch(() => undefined);
    }
  } catch {
    // Cache quota is optional; the in-memory object URL remains usable.
  }
}

async function downloadModel(url: string, emit: (percent: number) => void, signal: AbortSignal): Promise<string> {
  const cached = await readCachedModel(url);
  if (signal.aborted) throw abortError();
  if (cached) {
    emit(100);
    return cached;
  }

  const firstResponse = await fetchWithRetry(
    url,
    {
      headers: {
        Range: `bytes=0-${FIRST_REQUEST_BYTES - 1}`,
        Accept: "model/gltf-binary,application/octet-stream",
      },
    },
    signal,
  );

  if (firstResponse.status !== 206 && firstResponse.status !== 200) {
    throw new Error(`Asset CDN did not return a usable model response (${firstResponse.status})`);
  }

  const firstChunk = await firstResponse.arrayBuffer();
  const total = validateGlbHeader(firstChunk);
  const contentRange = firstResponse.headers.get("Content-Range") ?? "";
  const rangeMatch = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);

  if (firstResponse.status === 206) {
    if (
      !rangeMatch ||
      Number(rangeMatch[1]) !== 0 ||
      Number(rangeMatch[2]) !== firstChunk.byteLength - 1 ||
      Number(rangeMatch[3]) !== total
    ) {
      throw new Error("Asset CDN returned an invalid initial byte range");
    }
  } else if (firstChunk.byteLength !== total) {
    throw new Error("Asset CDN ignored the requested range");
  }

  let buffer: ArrayBuffer;

  if (firstChunk.byteLength === total) {
    buffer = firstChunk;
    emit(100);
  } else {
    let output: Uint8Array;
    try {
      output = new Uint8Array(total);
    } catch {
      throw new Error("Not enough memory to load this 3D model");
    }
    output.set(new Uint8Array(firstChunk), 0);

    let completed = firstChunk.byteLength;
    emit(Math.round((completed / total) * 100));

    const ranges: Array<{ start: number; end: number }> = [];
    for (let start = firstChunk.byteLength; start < total; start += CHUNK_SIZE) {
      ranges.push({ start, end: Math.min(total - 1, start + CHUNK_SIZE - 1) });
    }

    const connection = (navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }).connection;
    const constrained = Boolean(
      connection?.saveData ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g" ||
        connection?.effectiveType === "3g",
    );
    const workers = Math.min(constrained ? 2 : 5, ranges.length);

    const inner = new AbortController();
    const onOuterAbort = () => inner.abort();
    signal.addEventListener("abort", onOuterAbort, { once: true });

    let next = 0;
    try {
      await Promise.all(
        Array.from({ length: workers }, async () => {
          try {
            while (next < ranges.length) {
              if (inner.signal.aborted) throw abortError();

              const range = ranges[next];
              next += 1;
              const chunk = await fetchRange(url, range.start, range.end, inner.signal);

              if (chunk.byteLength !== range.end - range.start + 1) {
                throw new Error("Asset CDN returned an incomplete byte range");
              }

              output.set(new Uint8Array(chunk), range.start);
              completed += chunk.byteLength;
              emit(Math.min(100, Math.round((completed / total) * 100)));
            }
          } catch (error) {
            inner.abort();
            throw error;
          }
        }),
      );
    } finally {
      signal.removeEventListener("abort", onOuterAbort);
    }

    buffer = output.buffer as ArrayBuffer;
  }

  if (validateGlbHeader(buffer) !== buffer.byteLength || buffer.byteLength !== total) {
    throw new Error("Downloaded GLB size does not match its declared length");
  }

  if (signal.aborted) throw abortError();

  await storeModel(url, buffer, signal);
  if (signal.aborted) throw abortError();

  const blobUrl = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
  objectUrls.set(url, blobUrl);
  emit(100);
  return blobUrl;
}

function startDownload(url: string): Entry {
  const controller = new AbortController();
  const entry: Entry = {
    controller,
    promise: undefined as unknown as Promise<string>,
    subscribers: 0,
    listeners: new Set(),
    lastProgress: 0,
    settled: false,
  };

  const emit = (percent: number) => {
    entry.lastProgress = percent;
    entry.listeners.forEach((listener) => listener(percent));
  };

  const finish = () => {
    entry.settled = true;
    if (entries.get(url) === entry) entries.delete(url);
  };

  entry.promise = downloadModel(url, emit, controller.signal).then(
    (blobUrl) => {
      finish();
      return blobUrl;
    },
    (error) => {
      finish();
      throw error;
    },
  );

  entry.promise.catch(() => undefined);
  entries.set(url, entry);
  return entry;
}

export function peekModelUrl(url: string): string | null {
  return objectUrls.get(url.trim()) ?? null;
}

export function loadModelBuffer(
  url: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return Promise.reject(new Error("Model URL is empty"));

  const existing = objectUrls.get(normalizedUrl);
  if (existing) {
    onProgress?.(100);
    return Promise.resolve(existing);
  }

  if (signal?.aborted) return Promise.reject(abortError());

  const entry = entries.get(normalizedUrl) ?? startDownload(normalizedUrl);
  entry.subscribers += 1;
  if (onProgress) {
    entry.listeners.add(onProgress);
    onProgress(entry.lastProgress);
  }

  return new Promise<string>((resolve, reject) => {
    let left = false;

    const leave = () => {
      if (left) return;
      left = true;
      signal?.removeEventListener("abort", onAbort);
      if (onProgress) entry.listeners.delete(onProgress);
      entry.subscribers -= 1;

      if (entry.subscribers <= 0 && !entry.settled) {
        entry.controller.abort();
        if (entries.get(normalizedUrl) === entry) entries.delete(normalizedUrl);
      }
    };

    const onAbort = () => {
      if (left) return;
      leave();
      reject(abortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    entry.promise.then(
      (value) => {
        if (left) return;
        leave();
        resolve(value);
      },
      (error) => {
        if (left) return;
        leave();
        reject(error);
      },
    );
  });
}

export function clearModelCache(url?: string) {
  const normalized = url?.trim();
  if (!normalized) return;

  const objectUrl = objectUrls.get(normalized);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(normalized);
  }

  if ("caches" in window) {
    void caches.open(CACHE_NAME).then((cache) => cache.delete(normalized)).catch(() => undefined);
  }
}
