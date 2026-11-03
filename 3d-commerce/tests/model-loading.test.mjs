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

test("the model file is only downloaded once the visitor shows interest in the 3D view", () => {
  const gallery = read("../src/components/product/ProductGallery.tsx");
  assert.match(gallery, /loadModelBuffer\(modelUrl\)/);
  assert.match(gallery, /saveData/, "skipped on data-saver connections");
  assert.match(gallery, /onPointerEnter=\{item\.type === "model" \? prefetchModel/);
  const idleEffect = gallery.slice(gallery.indexOf("const preload = () =>"), gallery.indexOf("const imageItems"));
  assert.doesNotMatch(idleEffect, /loadModelBuffer/, "no background download of the GLB on page load");
});

test("admin product photos retry instead of staying broken after an upload", () => {
  const card = read("../src/components/admin/AdminProductCard.tsx");
  assert.match(card, /function AdminThumb/);
  assert.match(card, /<AdminThumb src=\{resolveMediaUrl\(m\.url\)/);
  assert.match(card, /"retry=" \+ attempt/);
});
