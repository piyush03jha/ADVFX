import { StorageService } from "../src/storage/storage.service";

async function main(): Promise<void> {
  if (process.env.STORAGE_PROVIDER !== "s3") {
    throw new Error("Set STORAGE_PROVIDER=s3 before running the Neon storage smoke test.");
  }

  const storage = new StorageService();
  const productId = "storage-smoke-test";
  const fileName = `smoke-${Date.now()}.glb`;
  const payload = Buffer.from("glTF-smoke-test");

  const stored = await storage.saveGeneratedFile(payload, productId, fileName);
  console.log("PUT", stored.storageKey, stored.size);

  try {
    const exists = await storage.exists(stored.storageKey);
    if (!exists) throw new Error("Object was uploaded but HEAD/exists returned false.");
    console.log("HEAD", "ok");

    const stream = await storage.createReadStream(stored.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const downloaded = Buffer.concat(chunks);
    if (!downloaded.equals(payload)) {
      throw new Error(`Downloaded object differs from uploaded payload (${downloaded.length} bytes).`);
    }
    console.log("GET", downloaded.length);

    await storage.delete(stored.storageKey);
    if (await storage.exists(stored.storageKey)) {
      throw new Error("Object still exists after DELETE.");
    }
    console.log("DELETE", "ok");
  } catch (error) {
    await storage.delete(stored.storageKey).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
