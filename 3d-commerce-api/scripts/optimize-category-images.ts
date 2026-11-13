import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

import { StorageService } from "../src/storage/storage.service";

/**
 * One-off backfill: shrink existing category images (2 MB+ PNGs) to small WebP.
 *
 * Usage (dry run is the default):
 *   npx tsx scripts/optimize-category-images.ts            # report only
 *   npx tsx scripts/optimize-category-images.ts --apply    # rewrite + update DB
 *
 * New uploads are already optimized by CategoriesService.uploadImage.
 */
const APPLY = process.argv.includes("--apply");
const SKIP_BELOW_BYTES = 150 * 1024;

function storageKeyFromImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url, "https://voxel3d.org");
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    for (const prefix of ["api/assets/", "assets/", "storage/"]) {
      if (pathname.startsWith(prefix)) {
        pathname = pathname.slice(prefix.length);
        break;
      }
    }
    const bucket = process.env.STORAGE_BUCKET?.trim();
    if (bucket && pathname.startsWith(`${bucket}/`)) pathname = pathname.slice(bucket.length + 1);
    return pathname.startsWith("categories/") ? pathname : null;
  } catch {
    return null;
  }
}

async function readAll(stream: AsyncIterable<Buffer | Uint8Array | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const storage = new StorageService();

  const categories = await prisma.category.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true },
  });

  let before = 0;
  let after = 0;

  for (const category of categories) {
    const key = category.imageUrl ? storageKeyFromImageUrl(category.imageUrl) : null;
    if (!key) {
      console.log(`skip   ${category.name}: image is not in categories/ storage`);
      continue;
    }

    const original = await readAll(await storage.createReadStream(key));
    if (original.length < SKIP_BELOW_BYTES && key.endsWith(".webp")) {
      console.log(`skip   ${category.name}: already small (${Math.round(original.length / 1024)} KiB)`);
      continue;
    }

    const optimized = await sharp(original)
      .rotate()
      .resize({ width: 640, height: 854, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();

    before += original.length;
    after += optimized.length;
    console.log(
      `${APPLY ? "write " : "plan  "} ${category.name}: ${Math.round(original.length / 1024)} KiB -> ${Math.round(optimized.length / 1024)} KiB`,
    );
    if (!APPLY) continue;

    const stored = await storage.saveCategoryImage(category.id, "category.webp", optimized);
    await prisma.category.update({ where: { id: category.id }, data: { imageUrl: stored.storageUrl } });
    if (stored.storageKey !== key) await storage.delete(key).catch(() => undefined);
  }

  console.log(
    `${APPLY ? "Done" : "Dry run"}: ${Math.round(before / 1024)} KiB -> ${Math.round(after / 1024)} KiB across ${categories.length} categories.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
