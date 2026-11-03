import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ObjectDiskCache } from "./object-disk-cache";

const open = (text: string, calls: { count: number }) => async () => {
  calls.count += 1;
  return { stream: Readable.from([Buffer.from(text)]), size: Buffer.byteLength(text) };
};

describe("ObjectDiskCache", () => {
  const newCache = (maxBytes: number) => new ObjectDiskCache(mkdtempSync(join(tmpdir(), "odc-")), maxBytes);

  it("downloads an object once and serves later requests from disk", async () => {
    const cache = newCache(1024);
    const calls = { count: 0 };
    const first = await cache.getOrFill("a", open("hello world", calls));
    const second = await cache.getOrFill("a", open("hello world", calls));

    expect(calls.count).toBe(1);
    expect(readFileSync(first!.path, "utf8")).toBe("hello world");
    expect(second!.path).toBe(first!.path);
  });

  it("shares one download between concurrent requests", async () => {
    const cache = newCache(1024);
    const calls = { count: 0 };
    const results = await Promise.all([1, 2, 3, 4].map(() => cache.getOrFill("b", open("same bytes", calls))));

    expect(calls.count).toBe(1);
    expect(new Set(results.map((item) => item!.path)).size).toBe(1);
  });

  it("does not cache objects larger than half the cache", async () => {
    const cache = newCache(10);
    const calls = { count: 0 };

    expect(await cache.getOrFill("big", open("0123456789", calls))).toBeNull();
    expect(await cache.getOrFill("big", open("0123456789", calls))).toBeNull();
    expect(calls.count).toBe(1); // remembered as too large, no second remote read
  });

  it("evicts the least recently used objects when over its size", async () => {
    const cache = newCache(40);
    const calls = { count: 0 };
    await cache.getOrFill("old", open("x".repeat(15), calls));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await cache.getOrFill("mid", open("y".repeat(15), calls));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await cache.getOrFill("new", open("z".repeat(15), calls));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(await cache.get("old")).toBeNull();
    expect(await cache.get("new")).not.toBeNull();
  });

  it("is disabled when the size is 0 and recovers from failed downloads", async () => {
    const off = newCache(0);
    expect(await off.getOrFill("k", open("data", { count: 0 }))).toBeNull();

    const cache = newCache(1024);
    const broken = async () => ({ stream: Readable.from([Buffer.from("abc")]), size: 99 });
    expect(await cache.getOrFill("short", broken)).toBeNull();
    expect(readdirSync((cache as unknown as { dir: string }).dir).filter((name) => name.endsWith(".part"))).toHaveLength(0);
  });
});
