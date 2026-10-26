import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const proxyPath = new URL("../src/app/api/assets/[...path]/route.ts", import.meta.url);
const galleryPath = new URL("../src/components/product/ProductGallery.tsx", import.meta.url);
const productsServicePath = new URL("../../3d-commerce-api/src/products/products.service.ts", import.meta.url);
const mediaUrlPath = new URL("../src/lib/media-url.ts", import.meta.url);
const modelLoaderPath = new URL("../src/lib/model-loader.ts", import.meta.url);
const productStagePath = new URL("../src/components/product/Product3DStage.tsx", import.meta.url);
const adminProductCardPath = new URL("../src/components/admin/AdminProductCard.tsx", import.meta.url);

test("asset proxy never reads or writes full-object cache entries for Range requests", async () => {
  const source = await readFile(proxyPath, "utf8");
  assert.match(source, /const range = request\.headers\.get\("range"\)/);
  assert.match(source, /if \(!range\)\s*\{\s*const hit = await cache\?\.match\(cacheKey\);\s*if \(hit\) return hit;/);
  assert.match(source, /if \(cache && !range && response\.status === 200\)/);
  assert.match(source, /if \(range\) backendHeaders\.set\("range", range\)/);
});

test("shop product query includes alternate images for frontend fallback", async () => {
  const source = await readFile(productsServicePath, "utf8");
  const start = source.indexOf("async findShopPage(");
  const end = source.indexOf("async findHeroProducts(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(source.slice(start, end), /where: \{ type: 'IMAGE' \}/);
  assert.match(source.slice(start, end), /take: 4/);
});

test("product gallery records broken images and falls back instead of silently doing nothing", async () => {
  const source = await readFile(galleryPath, "utf8");
  assert.match(source, /failedImages/);
  assert.match(source, /setActiveIndex\(activeIndex \+ 1\)/);
  assert.match(source, /failedImages\.has\(active\.src\) \? fallbackImage : active\.src/);
});

test("product images bypass the storefront proxy while other asset namespaces retain it", async () => {
  const source = await readFile(mediaUrlPath, "utf8");
  assert.match(source, /storageKey\.split\("\/"\)\[0\]/);
  assert.match(source, /"products", "categories", "custom-build-categories", "custom-build-options"/);
  assert.match(source, /function directProductAssetUrl/);
  assert.match(source, /https:\/\/api\.voxel3d\.org/);
  assert.match(source, /"\/api\/assets\/" \+ storageKey/);
});

test("GLB limits and download concurrency are reduced for constrained devices", async () => {
  const source = await readFile(modelLoaderPath, "utf8");
  assert.match(source, /function maxGlbBytesForDevice\(\)/);
  assert.match(source, /100 \* 1024 \* 1024/);
  assert.match(source, /deviceMemory !== undefined && deviceMemory <= 4/);
  assert.match(source, /Math\.min\(constrained \? 1 : 4, ranges\.length\)/);
});

test("admin thumbnails use canonical media URLs and the 3D stage exposes load progress", async () => {
  const [stage, adminCard] = await Promise.all([
    readFile(productStagePath, "utf8"),
    readFile(adminProductCardPath, "utf8"),
  ]);
  assert.match(adminCard, /resolveMediaUrl\(m\.url\)/);
  assert.match(stage, /const \{ blobUrl, progress, error, retry \} = useModelUrl\(model\)/);
  assert.match(stage, /Loading 3D preview/);
  assert.match(stage, /width: `\$\{Math\.max\(4, Math\.min\(progress, 100\)\)\}%`/);
  assert.match(stage, /onReady=\{handleModelReady\}/);
});
