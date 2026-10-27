import { HttpException } from "@nestjs/common";
import { StorageService } from "./storage.service";

const storageEnvKeys = [
  "STORAGE_PROVIDER",
  "STORAGE_BUCKET",
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "STORAGE_REGION",
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
});
