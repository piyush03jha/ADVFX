import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Draco decoder is served from our own origin, not the gstatic CDN", () => {
  assert.match(read("../src/lib/gltf-decoders.ts"), /setDecoderPath\("\/draco\/gltf\/"\)/);
  for (const file of ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
    assert.ok(existsSync(new URL(`../public/draco/gltf/${file}`, import.meta.url)), `${file} is bundled`);
  }
  assert.match(read("../public/_headers"), /\/draco\/\*\s+Cache-Control: public,max-age=31536000,immutable/);
});

test("every viewer that loads GLBs configures the local decoder", () => {
  for (const file of ["product/Product3DStage.tsx", "3d/ProductViewer.tsx"]) {
    assert.match(read(`../src/components/${file}`), /import "@\/lib\/gltf-decoders";/, file);
  }
});

test("choosing a product starts its photos and 3D file immediately", () => {
  const helper = read("../src/lib/image-prefetch.ts");
  assert.match(helper, /export function prefetchProductMedia/);
  assert.match(helper, /loadModelBuffer\(model\)/);
  assert.match(helper, /saveData/, "skipped on data-saver connections");

  for (const file of ["shop/ShopProductCard", "home/ProductCard", "product/RelatedProducts"]) {
    const source = read(`../src/components/${file}.tsx`);
    assert.match(source, /prefetchProductMedia/, file);
    assert.match(source, /onPointerDown=/, `${file} starts on pointer down`);
  }

  const gallery = read("../src/components/product/ProductGallery.tsx");
  assert.match(gallery, /prefetchProductMedia\(product\)/, "the product page itself also starts everything on mount");
});

test("landing, shop and suggested-product images are requested right away, not lazily", () => {
  for (const file of ["home/ProductCard", "home/shop-catogery", "shop/ShopProductCard", "product/RelatedProducts"]) {
    assert.doesNotMatch(read(`../src/components/${file}.tsx`), /loading="lazy"|"eager" : "lazy"/, file);
  }
  assert.match(read("../src/components/shop/ShopProductCard.tsx"), /loading=\{priority \? undefined : "eager"\}/);
});

test("the hero loads every hero model once the visible one is ready", () => {
  const hero = read("../src/components/home/Hero.tsx");
  assert.match(hero, /heroProducts\.forEach\(\(_, index\) => \{\s*if \(index !== currentIndex\) void preloadModel\(index\)/);
  assert.doesNotMatch(hero, /const keep = new Set/);
});

test("admin product photos retry instead of staying broken after an upload", () => {
  const card = read("../src/components/admin/AdminProductCard.tsx");
  assert.match(card, /function AdminThumb/);
  assert.match(card, /<AdminThumb src=\{resolveMediaUrl\(m\.url\)/);
  assert.match(card, /"retry=" \+ attempt/);
});
