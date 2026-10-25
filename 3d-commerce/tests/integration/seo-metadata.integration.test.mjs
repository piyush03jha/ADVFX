import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sitemap = await readFile(new URL("../../src/app/sitemap.ts", import.meta.url), "utf8");
const homepage = await readFile(new URL("../../src/app/page.tsx", import.meta.url), "utf8");

test("homepage structured data uses the configured canonical origin", () => {
  assert.match(homepage, /absoluteUrl\("\/#webpage"\)/);
  assert.match(homepage, /url: absoluteUrl\("\/"\)/);
  assert.doesNotMatch(homepage, /dateModified: "2026-10-23"/);
});

test("sitemap avoids advertising a stale hard-coded homepage modification date", () => {
  assert.match(sitemap, /url: absoluteUrl\("\/"\), changeFrequency: "weekly", priority: 1/);
  assert.doesNotMatch(sitemap, /lastModified: new Date\("2026-10-23T00:00:00Z"\)/);
  assert.match(sitemap, /product\.status !== "ACTIVE"/);
  assert.match(sitemap, /absoluteUrl\(\`\/product\/\$\{encodeURIComponent\(product\.slug\)\}\`\)/);
});


test("custom-order page publishes HowTo steps and page-specific metadata", async () => {
  const custom = await readFile(new URL("../../src/app/custom/page.tsx", import.meta.url), "utf8");
  const customLayout = await readFile(new URL("../../src/app/custom/layout.tsx", import.meta.url), "utf8");

  assert.match(custom, /"@type": "HowTo"/);
  assert.match(custom, /"@type": "HowToStep"/);
  assert.match(custom, /Upload clear JPG or PNG photos/);
  assert.match(custom, /plans physical production/);
  assert.match(custom, /delivery is arranged/);
  assert.match(customLayout, /Custom 3D Printed Models from Photos/);
  assert.match(customLayout, /absoluteUrl\("\/custom"\)/);
});
