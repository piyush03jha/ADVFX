import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Minimal browser surface for model-loader.ts (no Cache API -> network path).
globalThis.window = globalThis;
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });

// Node's type stripping cannot run TypeScript parameter properties, so load a copy
// of the module with that one constructor written out by hand.
const source = readFileSync(new URL("../src/lib/model-loader.ts", import.meta.url), "utf8").replace(
  /constructor\(public readonly status: number\) \{\s*super\(([^;]*)\);/,
  "status: number;\n  constructor(status: number) {\n    super($1);\n    this.status = status;",
);
const dir = mkdtempSync(join(tmpdir(), "model-loader-"));
const file = join(dir, "model-loader.ts");
writeFileSync(file, source);
const { loadModelBuffer } = await import(pathToFileURL(file).href);

function makeGlb(bytes) {
  const buffer = new Uint8Array(bytes);
  const view = new DataView(buffer.buffer);
  buffer.set([0x67, 0x6c, 0x54, 0x46], 0); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes, true);
  return buffer;
}

function streamed(slice, chunk) {
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= slice.length) return controller.close();
      controller.enqueue(slice.slice(offset, offset + chunk));
      offset += chunk;
    },
  });
}

test("download progress advances gradually instead of jumping from 0 to 100", async () => {
  const glb = makeGlb(2 * 1024 * 1024); // small enough to arrive in the first request
  globalThis.fetch = async (_url, init) => {
    const range = /bytes=(\d+)-(\d+)/.exec(init.headers.Range);
    const start = Number(range[1]);
    const end = Math.min(Number(range[2]), glb.length - 1);
    const slice = glb.subarray(start, end + 1);
    return new Response(streamed(slice, 64 * 1024), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${glb.length}`, "Content-Length": String(slice.length) },
    });
  };

  const seen = [];
  await loadModelBuffer("https://cdn.test/gradual.glb", (percent) => seen.push(percent));

  assert.equal(seen.at(-1), 100, "finishes at 100");
  const steps = seen.filter((value) => value > 0 && value < 100);
  assert.ok(steps.length >= 10, `expected many intermediate values, got ${JSON.stringify(seen)}`);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), "progress never goes backwards");
  assert.ok(Math.max(...seen.slice(0, -1)) <= 99, "100 is only reported once the file is complete");
});

test("progress counts every byte across parallel range requests", async () => {
  const glb = makeGlb(30 * 1024 * 1024); // larger than the first 12 MB request
  globalThis.fetch = async (_url, init) => {
    const range = /bytes=(\d+)-(\d+)/.exec(init.headers.Range);
    const start = Number(range[1]);
    const end = Math.min(Number(range[2]), glb.length - 1);
    const slice = glb.subarray(start, end + 1);
    return new Response(streamed(slice, 512 * 1024), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${glb.length}`, "Content-Length": String(slice.length) },
    });
  };

  const seen = [];
  await loadModelBuffer("https://cdn.test/large.glb", (percent) => seen.push(percent));

  assert.equal(seen.at(-1), 100);
  assert.ok(seen.filter((value) => value > 0 && value < 100).length >= 10, JSON.stringify(seen));
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
});
