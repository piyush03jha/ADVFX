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
