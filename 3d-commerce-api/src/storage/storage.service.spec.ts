import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpException } from "@nestjs/common";
import { StorageService } from "./storage.service";

const storageEnvKeys = [
  "STORAGE_PROVIDER",
  "STORAGE_BUCKET",
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "STORAGE_REGION",
  "ASSET_CACHE_MAX_MB",
  "ASSET_CACHE_DIR",
] as const;

describe("StorageService remote byte ranges", () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of storageEnvKeys) {
      originalEnv.set(key, process.env[key]);
    }

    process.env.STORAGE_PROVIDER = "b2";
    process.env.STORAGE_BUCKET = "test-bucket";
    process.env.STORAGE_ENDPOINT = "https://s3.us-east-005.backblazeb2.com";
    process.env.STORAGE_ACCESS_KEY_ID = "test-key";
    process.env.STORAGE_SECRET_ACCESS_KEY = "test-secret";
    process.env.STORAGE_REGION = "us-east-005";
    // Each test decides whether the local object cache is on.
    process.env.ASSET_CACHE_MAX_MB = "0";
    process.env.ASSET_CACHE_DIR = mkdtempSync(join(tmpdir(), "storage-spec-"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of storageEnvKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    originalEnv.clear();
  });

  it("maps an upstream 416 response to HTTP 416 instead of a gateway error", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        "<Error><Code>InvalidRange</Code><Message>The requested range is not satisfiable</Message></Error>",
        { status: 416, headers: { "content-type": "application/xml" } },
      ),
    );

    const storage = new StorageService();

    let thrown: unknown;
    try {
      await storage.openReadStreamRange("products/product-1/model.glb", 999);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(416);
  });

  it("downloads an object from remote storage once and serves every later range from disk", async () => {
    process.env.ASSET_CACHE_MAX_MB = "64";
    const body = Buffer.from("0123456789abcdefghij");
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(body, { status: 200, headers: { "content-length": String(body.length) } }),
    );

    const storage = new StorageService();
    const read = async (start: number, end?: number) => {
      const result = await storage.openReadStreamRange("products/product-1/model.glb", start, end);
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) chunks.push(Buffer.from(chunk));
      return { text: Buffer.concat(chunks).toString(), result };
    };

    const first = await read(0, 4);
    const second = await read(10);
    const third = await read(5, 9);

    expect(first.text).toBe("01234");
    expect(second.text).toBe("abcdefghij");
    expect(third.text).toBe("56789");
    expect(first.result.totalSize).toBe(20);
    expect(fetchMock).toHaveBeenCalledTimes(1); // one Backblaze download, three views

    await expect(storage.openReadStreamRange("products/product-1/model.glb", 999)).rejects.toMatchObject({ status: 416 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
