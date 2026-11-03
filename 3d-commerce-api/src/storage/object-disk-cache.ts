import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink, utimes } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

export type CachedObject = { path: string; size: number };
export type OpenedObject = { stream: Readable; size?: number };

const STALE_PART_MS = 60 * 60 * 1000;

/**
 * Small LRU disk cache for objects read from remote storage.
 *
 * Why: every storefront view of a product image or 3D model used to be a fresh
 * download from Backblaze B2, whose free tier allows about 1 GB of downloads a day.
 * Product objects are content-addressed (never change), so each one only needs to be
 * downloaded once; every later request - full or ranged - is served from local disk.
 *
 *  - concurrent requests for the same object share ONE remote download;
 *  - objects bigger than half the cache are not cached (callers read them directly);
 *  - the least recently used objects are evicted when the cache is over its size;
 *  - any problem (disk full, bad download) falls back to reading remote storage.
 */
export class ObjectDiskCache {
  private readonly inflight = new Map<string, Promise<CachedObject | null>>();
  private readonly tooLarge = new Set<string>();
  private ready: Promise<void> | null = null;

  constructor(
    private readonly dir: string,
    private readonly maxBytes: number,
  ) {}

  get enabled() {
    return this.maxBytes > 0;
  }

  private pathFor(key: string) {
    return join(this.dir, createHash("sha256").update(key).digest("hex") + ".bin");
  }

  private ensureDir() {
    this.ready ??= mkdir(this.dir, { recursive: true }).then(() => undefined);
    return this.ready;
  }

  async get(key: string): Promise<CachedObject | null> {
    if (!this.enabled) return null;
    const path = this.pathFor(key);
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      // Touch so recently used objects survive eviction.
      const now = new Date();
      void utimes(path, now, now).catch(() => undefined);
      return { path, size: info.size };
    } catch {
      return null;
    }
  }

  /** The cached object, downloading it first if needed. null = caller should read remote directly. */
  async getOrFill(key: string, open: () => Promise<OpenedObject>): Promise<CachedObject | null> {
    if (!this.enabled || this.tooLarge.has(key)) return null;

    const hit = await this.get(key);
    if (hit) return hit;

    let running = this.inflight.get(key);
    if (!running) {
      running = this.fill(key, open).finally(() => {
        this.inflight.delete(key);
      });
      this.inflight.set(key, running);
    }
    return running;
  }

  private async fill(key: string, open: () => Promise<OpenedObject>): Promise<CachedObject | null> {
    const limit = Math.floor(this.maxBytes / 2);
    const { stream, size } = await open();

    if (size !== undefined && size > limit) {
      stream.destroy();
      this.tooLarge.add(key);
      return null;
    }

    const path = this.pathFor(key);
    const part = `${path}.${randomUUID()}.part`;
    let written = 0;

    try {
      await this.ensureDir();
      const counter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          written += chunk.length;
          if (written > limit) return callback(new Error("object is larger than the cache allows"));
          callback(null, chunk);
        },
      });
      await pipeline(stream, counter, createWriteStream(part));

      if (size !== undefined && written !== size) throw new Error("incomplete download");
      await rename(part, path);
    } catch {
      await unlink(part).catch(() => undefined);
      if (written > limit) this.tooLarge.add(key);
      return null;
    }

    void this.evict().catch(() => undefined);
    return { path, size: written };
  }

  async invalidate(key: string) {
    this.tooLarge.delete(key);
    await unlink(this.pathFor(key)).catch(() => undefined);
  }

  /** Delete least recently used objects until the cache is back under ~90% of its size. */
  private async evict() {
    const names = await readdir(this.dir);
    const now = Date.now();
    const files: Array<{ path: string; size: number; mtime: number }> = [];
    let total = 0;

    for (const name of names) {
      const path = join(this.dir, name);
      const info = await stat(path).catch(() => null);
      if (!info?.isFile()) continue;
      if (name.endsWith(".part")) {
        if (now - info.mtimeMs > STALE_PART_MS) await unlink(path).catch(() => undefined);
        continue;
      }
      files.push({ path, size: info.size, mtime: info.mtimeMs });
      total += info.size;
    }

    if (total <= this.maxBytes) return;
    files.sort((a, b) => a.mtime - b.mtime);
    const target = this.maxBytes * 0.9;
    for (const file of files) {
      if (total <= target) break;
      await unlink(file.path).catch(() => undefined);
      total -= file.size;
    }
  }

  readStream(object: CachedObject, start?: number, end?: number) {
    return start === undefined ? createReadStream(object.path) : createReadStream(object.path, { start, end });
  }
}
