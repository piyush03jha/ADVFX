import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepage = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const site = await readFile(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const shop = await readFile(new URL("../src/app/shop/page.tsx", import.meta.url), "utf8");
const custom = await readFile(new URL("../src/app/custom/page.tsx", import.meta.url), "utf8");
const customLayout = await readFile(new URL("../src/app/custom/layout.tsx", import.meta.url), "utf8");
const about = await readFile(new URL("../src/app/about/page.tsx", import.meta.url), "utf8");
const categories = await readFile(new URL("../src/components/home/shop-catogery.tsx", import.meta.url), "utf8");
const navbar = await readFile(new URL("../src/components/layout/SiteNavbar.tsx", import.meta.url), "utf8");

test("homepage targets physical-product purchase intent without promising digital downloads", () => {
  assert.match(site, /Buy 3D Printed Models & Collectibles in India \| Voxel3D/);
  assert.match(site, /Buy physical 3D printed models, anime figures, miniatures and collectibles in India/);
  assert.match(site, /custom figure made from your photos/);
  assert.match(homepage, /HOME_TITLE/);
  assert.match(homepage, /HOME_DESCRIPTION/);
  assert.ok((homepage.match(/description:/g) ?? []).length > 0);
  assert.doesNotMatch(homepage, /downloadable 3D files|digital product delivery/i);
});

test("global metadata reinforces the brand and relevant product categories", () => {
  assert.match(layout, /buy 3D printed models in India/);
  assert.match(layout, /3D printed collectibles/);
  assert.match(layout, /custom 3D printed models from photos/);
  assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
});

test("shop metadata targets figure and collectible shopping queries separately from the homepage", () => {
  assert.match(shop, /Shop 3D Printed Models/);
  assert.match(shop, /Shop physical 3D printed models, figures, miniatures and collectibles/);
  assert.match(shop, /path: "\/shop"/);
});


test("custom-order page has unique metadata and a canonical URL", () => {
  assert.match(customLayout, /Custom 3D Printed Models from Photos/);
  assert.match(customLayout, /absoluteUrl\("\/custom"\)/);
  assert.match(customLayout, /JPG or PNG photos, dimensions and requirements/);
});

test("custom-order HowTo structured data matches the visible three-step workflow", () => {
  assert.match(custom, /"@type": "HowTo"/);
  assert.match(custom, /"@type": "HowToStep"/);
  assert.match(custom, /Share reference photos and requirements/);
  assert.match(custom, /Team reviews and prepares the model/);
  assert.match(custom, /Confirm the build and arrange delivery/);
  assert.match(custom, /id="custom-request"/);
  assert.match(custom, /id="how-we-work"/);
});


test("homepage keeps the long-form About section on the About page", () => {
  assert.doesNotMatch(homepage, /HomeAbout/);
  assert.match(about, /<HomeAbout productCount=\{0\} categoryNames=\{\[\]\} \/>/);
  assert.match(about, /canonical: "\/about"/);
  assert.match(homepage, /absoluteUrl\("\/about#how-to-order"\)/);
  assert.match(homepage, /absoluteUrl\("\/about#custom-order-steps"\)/);
});

test("landing-page category rail is horizontally scrollable and keyboard accessible", () => {
  assert.match(categories, /aria-label="Browse product categories"/);
  assert.match(categories, /overflow-x-auto/);
  assert.match(categories, /scrollbar-width:thin/);
  assert.match(categories, /tabIndex=\{0\}/);
  assert.match(categories, /snap-mandatory/);
});

test("Category navigation uses an in-page anchor when already on the homepage", () => {
  assert.match(navbar, /usePathname/);
  assert.match(navbar, /pathname === "\/" \? "#categories" : "\/#categories"/);
  assert.match(navbar, /<NavItems items=\{visibleNavItems\} \/>/);
  assert.match(navbar, /visibleNavItems\.map\(\(item\) => \(/);
});
