import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const proxyPath = new URL("../../src/app/api/assets/[...path]/route.ts", import.meta.url);
const modelLoaderPath = new URL("../../src/lib/model-loader.ts", import.meta.url);
const storageControllerPath = new URL("../../../3d-commerce-api/src/storage/asset.controller.ts", import.meta.url);
const mediaUrlPath = new URL("../../src/lib/media-url.ts", import.meta.url);

test("asset proxy forwards Range and preserves upstream partial-response headers", async () => {
  const source = await readFile(proxyPath, "utf8");
  assert.match(source, /if \(range\) backendHeaders\.set\("range", range\)/);
  assert.match(source, /"content-range"/);
  assert.match(source, /response\.status === 200/);
  assert.match(source, /!range && response\.status === 200/);
});

test("GLB downloader validates complete GLB headers and rejects malformed ranges", async () => {
  const source = await readFile(modelLoaderPath, "utf8");
  assert.match(source, /GLB declares an invalid file size/);
  assert.match(source, /Asset CDN returned an invalid byte range/);
  assert.match(source, /Asset CDN did not return a byte range/);
});

test("backend product asset endpoint advertises byte-range support", async () => {
  const source = await readFile(storageControllerPath, "utf8");
  assert.match(source, /openReadStreamRange/);
  assert.match(source, /Accept-Ranges/);
  assert.match(source, /Content-Range/);
});

test("legacy absolute product asset URLs normalize to storefront proxy", async () => {
  const source = await readFile(mediaUrlPath, "utf8");
  assert.match(source, /parsed\.hostname === "api\.voxel3d\.org"/);
  assert.match(source, /return \(\s*"\/api\/assets"/);
  assert.match(source, /raw\.startsWith\("\/storage\/"\)/);
});
