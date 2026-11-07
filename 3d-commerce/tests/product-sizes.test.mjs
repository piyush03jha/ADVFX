import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const catalog = readFileSync(new URL("../src/lib/catalog-api.ts", import.meta.url), "utf8");
const wishlist = readFileSync(new URL("../src/context/WishlistContext.tsx", import.meta.url), "utf8");

test("storefront mapper ignores size variants when a product has sizes off", () => {
  assert.match(catalog, /product\.hasSizes === false \? \[\] : \(product\.variants \?\? \[\]\)/);
  assert.match(catalog, /variants: sizedVariants/);
  assert.match(catalog, /hasSizes: product\.hasSizes !== false/);
});

test("wishlist price ignores size variants when sizes are off", () => {
  assert.match(wishlist, /product\.hasSizes === false \? \[\] : product\.variants \?\? \[\]/);
});
