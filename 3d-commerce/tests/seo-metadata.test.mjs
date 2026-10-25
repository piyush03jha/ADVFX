import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepage = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const shop = await readFile(new URL("../src/app/shop/page.tsx", import.meta.url), "utf8");

test("homepage targets physical-product purchase intent without promising digital downloads", () => {
  assert.match(homepage, /Buy 3D Printed Models & Collectibles in India \| Voxel3D/);
  assert.match(homepage, /Buy physical 3D printed models, figures, miniatures and collectibles in India/);
  assert.match(homepage, /custom model from JPG or PNG reference images/);
  assert.doesNotMatch(homepage, /downloadable 3D files|digital product delivery/i);
});

test("global metadata reinforces the brand and relevant product categories", () => {
  assert.match(layout, /buy 3D printed models in India/);
  assert.match(layout, /3D printed collectibles/);
  assert.match(layout, /custom 3D printed models from photos/);
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
});

test("shop metadata targets figure and collectible shopping queries separately from the homepage", () => {
  assert.match(shop, /Shop 3D Printed Figures, Miniatures & Collectibles/);
  assert.match(shop, /Shop physical 3D printed figures, miniatures, display models and collectibles/);
  assert.match(shop, /path: "\/shop"/);
});
