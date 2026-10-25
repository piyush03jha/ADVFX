import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const proxyPath = new URL("../src/app/api/assets/[...path]/route.ts", import.meta.url);
const productsServicePath = new URL("../../3d-commerce-api/src/products/products.service.ts", import.meta.url);

test("asset proxy does not read the full-object cache for Range requests", async () => {
  const source = await readFile(proxyPath, "utf8");
  assert.match(source, /const range = request\.headers\.get\("range"\)/);
  assert.match(source, /if \(!range\)\s*\{\s*const hit = await cache\?\.match\(cacheKey\);\s*if \(hit\) return hit;/);
  assert.match(source, /if \(cache && !range && response\.status === 200\)/);
});

test("shop product query includes alternate images for frontend fallback", async () => {
  const source = await readFile(productsServicePath, "utf8");
  const start = source.indexOf("async findShopPage(");
  const end = source.indexOf("async findHeroProducts(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const listing = source.slice(start, end);
  assert.match(listing, /where: \{ type: 'IMAGE' \}/);
  assert.match(listing, /take: 4/);
});
